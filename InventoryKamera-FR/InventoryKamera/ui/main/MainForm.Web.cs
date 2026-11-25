using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace InventoryKamera
{
    // Interface WebView2 (ui/web/kamera.html) posée par-dessus l'interface WinForms, qui reste en place dessous :
    // le scan continue d'écrire dans les mêmes contrôles, ce pont recopie leur état dans la page et
    // renvoie les actions de la page vers ces contrôles. Sans runtime WebView2, l'interface WinForms reste affichée.
    public partial class MainForm
    {
        private readonly Dictionary<string, Button> webButtons = new Dictionary<string, Button>();
        private readonly Dictionary<string, int> webLogLength = new Dictionary<string, int>();
        private readonly Dictionary<string, Image> webImages = new Dictionary<string, Image>();
        private bool connectionEditing;
        private WebView2 web;
        private Timer webTimer;
        private string lastWebState;

        [DllImport("dwmapi.dll")] private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        // Réglages liés aux contrôles WinForms : on lit et écrit le réglage directement, car la liaison d'un contrôle
        // posé sur un onglet jamais affiché ne s'active pas.
        private Dictionary<string, KeyValuePair<string, Control>> BoundSettings() => new Dictionary<string, KeyValuePair<string, Control>>
        {
            ["scanCharacters"] = Bound("ScanCharacters", Characters_CheckBox), ["scanWeapons"] = Bound("ScanWeapons", Weapons_CheckBox),
            ["scanArtifacts"] = Bound("ScanArtifacts", Artifacts_Checkbox), ["scanMaterials"] = Bound("ScanMaterials", Materials_CheckBox),
            ["scanDevItems"] = Bound("ScanCharDevItems", CharDevItems_CheckBox), ["equipWeapons"] = Bound("EquipWeapons", EquipWeaponsCheckBox),
            ["equipArtifacts"] = Bound("EquipArtifacts", EquipArtifactsCheckBox), ["logScreenshots"] = Bound("LogScreenshots", LogScreenshotsCheckBox),
            ["weaponRarity"] = Bound("MinimumWeaponRarity", WeaponRarityControl), ["artifactRarity"] = Bound("MinimumArtifactRarity", ArtifactRarityControl),
            ["weaponLevel"] = Bound("MinimumWeaponLevel", MinimumWeaponLevelControl), ["artifactLevel"] = Bound("MinimumArtifactLevel", numericUpDown1),
            ["travelerName"] = Bound("TravelerName", travelerNameTextBox), ["wandererName"] = Bound("WandererName", wandererNameTextBox),
        };
        private static KeyValuePair<string, Control> Bound(string setting, Control control) => new KeyValuePair<string, Control>(setting, control);

        private void StyleWindowFrame()
        {
            try
            {
                int on = 1; DwmSetWindowAttribute(Handle, 20, ref on, 4);                                  // barre de titre sombre
                int caption = Night.R | Night.G << 8 | Night.B << 16; DwmSetWindowAttribute(Handle, 35, ref caption, 4); // Windows 11
                int text = Ink.R | Ink.G << 8 | Ink.B << 16; DwmSetWindowAttribute(Handle, 36, ref text, 4);
                int border = Line.R | Line.G << 8 | Line.B << 16; DwmSetWindowAttribute(Handle, 34, ref border, 4);
                int round = 2; DwmSetWindowAttribute(Handle, 33, ref round, 4);
            }
            catch (Exception error) when (error is DllNotFoundException || error is EntryPointNotFoundException) { }
        }

        private async void StartWebInterface()
        {
            StyleWindowFrame();
            string html;
            using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("InventoryKamera.kamera.html"))
            {
                if (stream == null) { Logger.Warn("kamera.html absent, interface classique conservée"); return; }
                using (var reader = new StreamReader(stream)) html = reader.ReadToEnd();
            }
            try
            {
                CoreWebView2Environment.GetAvailableBrowserVersionString();
                web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Night };
                Controls.Add(web); web.BringToFront();
                var folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GenshinTracker", "KameraFR", "WebView2");
                var environment = await CoreWebView2Environment.CreateAsync(null, folder);
                await web.EnsureCoreWebView2Async(environment);
                var core = web.CoreWebView2;
#if DEBUG
                core.Settings.AreDevToolsEnabled = true;
#else
                core.Settings.AreDevToolsEnabled = false;
#endif
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsZoomControlEnabled = false;
                core.Settings.AreBrowserAcceleratorKeysEnabled = false;
                core.Settings.IsPasswordAutosaveEnabled = false;
                core.Settings.IsGeneralAutofillEnabled = false;
                bool loaded = false;
                core.NavigationStarting += (s, e) => { if (loaded) { e.Cancel = true; OpenExternal(e.Uri); } };
                core.NavigationCompleted += (s, e) => { loaded = true; web.Focus(); };
                core.NewWindowRequested += (s, e) => { e.Handled = true; OpenExternal(e.Uri); };
                core.WebMessageReceived += OnWebMessage;
                core.NavigateToString(html);
            }
            catch (Exception error)
            {
                Logger.Warn(error, "WebView2 indisponible, interface classique conservée");
                if (web != null) { Controls.Remove(web); web.Dispose(); web = null; }
            }
        }

        private static void OpenExternal(string uri)
        {
            if (Uri.TryCreate(uri, UriKind.Absolute, out var target) && (target.Scheme == Uri.UriSchemeHttps || target.Scheme == Uri.UriSchemeHttp))
                Process.Start(new ProcessStartInfo(target.AbsoluteUri) { UseShellExecute = true });
        }

        private void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            JObject message;
            try { message = JObject.Parse(e.WebMessageAsJson); } catch (JsonException) { return; }
            var id = (string)message["id"];
            try
            {
                switch ((string)message["cmd"])
                {
                    case "ready":
                        lastWebState = null; webLogLength.Clear(); webImages.Clear(); PushWebState();
                        if (webTimer == null)
                        {
                            // ponytail: relevé de l'état toutes les 150 ms, des événements par contrôle si ça coûte un jour.
                            webTimer = new Timer { Interval = 150 }; webTimer.Tick += (s, a) => PushWebState(); webTimer.Start();
                            FormClosed += (s, a) => webTimer.Dispose();
                        }
                        break;
                    case "click": ClickFromWeb(id); break;
                    case "set": SetFromWeb(id, message["value"]); break;
                    case "key": KeyFromWeb(id, (int?)message["vk"] ?? 0); break;
                }
            }
            catch (Exception error)
            {
                Logger.Error(error, "Action de l'interface impossible : {0}", id);
                UserInterface.Trace("Action impossible (" + id + ") : " + error.Message);
            }
            PushWebState();
        }

        // PerformClick ignore les boutons d'un onglet masqué : on appelle OnClick, en respectant Enabled.
        private static readonly MethodInfo onClick = typeof(Control).GetMethod("OnClick", BindingFlags.Instance | BindingFlags.NonPublic);
        private static void Press(Button button) { if (button != null && button.Enabled) onClick.Invoke(button, new object[] { EventArgs.Empty }); }

        private void ClickFromWeb(string id)
        {
            switch (id)
            {
                case "scan": Press(StartScan_Button); break;
                case "browseOutput": Press(FileSelectButton); break;
                case "exportOptimizer": Press(ManualExportButton); break;
                case "changeAccount": Press(changeAccountButton); break;
                case "cancelChange": Press(cancelConnectionButton); break;
                case "gameProcess": updateExecutablesToolStripMenuItem_Click(this, EventArgs.Empty); break;
                case "referential": DatabaseUpdateMenuItem_Click(this, EventArgs.Empty); break;
                default: if (id != null && webButtons.TryGetValue(id, out var button)) Press(button); break;
            }
        }

        private void SetFromWeb(string id, JToken value)
        {
            var settings = Properties.Settings.Default;
            if (id != null && BoundSettings().TryGetValue(id, out var bound))
            {
                var current = settings[bound.Key];
                object typed = Convert.ChangeType((object)value?.ToObject<object>() ?? "", current.GetType(), System.Globalization.CultureInfo.InvariantCulture);
                if (bound.Value is NumericUpDown number) { typed = Math.Max(number.Minimum, Math.Min(number.Maximum, (decimal)typed)); number.Value = (decimal)typed; }
                else if (bound.Value is CheckBox check) check.Checked = (bool)typed;
                else bound.Value.Text = (string)typed;
                settings[bound.Key] = typed;
                return;
            }
            switch (id)
            {
                case "password": connectionPassword.Text = (string)value ?? ""; break;
                case "accountName": connectionName.Text = (string)value ?? ""; break;
                case "siteAddress": siteAddress.Text = (string)value ?? ""; break;
                case "pairingCode": pairingCode.Text = (string)value ?? ""; break;
                case "outputPath": OutputPath_TextBox.Text = (string)value ?? ""; settings.OutputPath = OutputPath_TextBox.Text; break;
                case "language": Language_ComboBox.SelectedItem = (string)value == "EN" ? "EN" : "FR"; break;
                case "delay":
                    int delay = Math.Max(ScannerDelay_TrackBar.Minimum, Math.Min(ScannerDelay_TrackBar.Maximum, (int)value));
                    ScannerDelay_TrackBar.Value = delay; settings.ScannerDelay = delay; break;
            }
        }

        private void KeyFromWeb(string id, int key)
        {
            var box = id == "inventory" ? inventoryToolStripTextBox : id == "character" ? characterToolStripTextBox : id == "slot1" ? slot1StripTextBox : null;
            if (box != null && key > 0) OptionsMenuItem_KeyDown(box, new KeyEventArgs((Keys)key));
        }

        private static JObject Tone(Label label, Color neutral)
        {
            var result = new JObject { ["text"] = label?.Text ?? "" };
            if (label != null && label.ForeColor != neutral) result["ok"] = label.ForeColor != Color.Salmon;
            return result;
        }

        private void PushWebState()
        {
            var core = web?.CoreWebView2;
            if (core == null || IsDisposed) return;
            var settings = Properties.Settings.Default;
            var values = new JObject();
            foreach (var bound in BoundSettings()) values[bound.Key] = JToken.FromObject(settings[bound.Value.Key] ?? "");
            values["outputPath"] = OutputPath_TextBox.Text;
            values["siteAddress"] = siteAddress.Text; values["accountName"] = connectionName.Text; values["pairingCode"] = pairingCode.Text;
            values["delay"] = ScannerDelay_TrackBar.Value.ToString();
            values["language"] = GameLanguage.IsFrench ? "FR" : "EN";
            JArray Range(NumericUpDown n) => new JArray(n.Minimum, n.Maximum);
            Func<string, bool> enabled = name => webButtons.TryGetValue(name, out var b) && b.Enabled;
            var rows = new JArray(accountCharacters.Rows.Cast<DataGridViewRow>().Where(r => !r.IsNewRow)
                .Select(r => new JArray(r.Cells.Cast<DataGridViewCell>().Select(c => c.Value == null ? "–" : c.Value.ToString()))));
            var state = new JObject
            {
                ["version"] = Assembly.GetExecutingAssembly().GetName().Version.ToString(3),
                ["running"] = running,
                ["status"] = Tone(ProgramStatus_Label, Color.Empty),
                ["syncProgress"] = Tone(syncProgressLabel, Muted),
                ["hint"] = localScanHint.Text,
                ["counts"] = new JObject
                {
                    ["characters"] = CharactersScanned_Label.Text, ["weapons"] = WeaponsScannedCount_Label.Text, ["weaponsMax"] = WeaponsMax_Labell.Text,
                    ["artifacts"] = ArtifactsScanned_Label.Text, ["artifactsMax"] = ArtifactsMax_Label.Text,
                },
                ["settings"] = values,
                ["ranges"] = new JObject
                {
                    ["weaponRarity"] = Range(WeaponRarityControl), ["artifactRarity"] = Range(ArtifactRarityControl),
                    ["weaponLevel"] = Range(MinimumWeaponLevelControl), ["artifactLevel"] = Range(numericUpDown1),
                },
                ["keys"] = new JObject { ["inventory"] = inventoryToolStripTextBox.Text, ["character"] = characterToolStripTextBox.Text, ["slot1"] = slot1StripTextBox.Text },
                ["enabled"] = new JObject
                {
                    ["login"] = enabled("login"), ["pair"] = enabled("pair"), ["retry"] = enabled("retry"), ["refreshAccount"] = enabled("refreshAccount"),
                    ["sendFile"] = enabled("sendFile"), ["exportOptimizer"] = ManualExportButton.Enabled,
                },
                ["account"] = new JObject
                {
                    ["name"] = ClientSync.AccountName, ["site"] = ClientSync.SiteUrl, ["rejected"] = ClientSync.AccessRejected, ["editing"] = connectionEditing,
                    ["syncStatus"] = Tone(syncStatusLabel, Muted), ["summary"] = accountSummary.Text, ["rows"] = rows, ["history"] = accountHistory.Text,
                },
            };
            var json = state.ToString(Formatting.None);
            if (json != lastWebState) { lastWebState = json; core.PostWebMessageAsJson("{\"type\":\"state\",\"state\":" + json + "}"); }

            foreach (var log in new[] { new { Id = "error", Box = ErrorLog_TextBox }, new { Id = "gear", Box = ArtifactOutput_TextBox }, new { Id = "character", Box = CharacterOutput_TextBox } })
            {
                int length = log.Box.TextLength; webLogLength.TryGetValue(log.Id, out int sent);
                if (length == sent && webLogLength.ContainsKey(log.Id)) continue;
                bool reset = length < sent || !webLogLength.ContainsKey(log.Id);
                var text = log.Box.Text;
                text = reset ? text.Substring(Math.Max(0, text.Length - 60000)) : text.Substring(sent);
                webLogLength[log.Id] = length;
                core.PostWebMessageAsJson(new JObject { ["type"] = "log", ["id"] = log.Id, ["reset"] = reset, ["text"] = text.Replace("\r\n", "\n") }.ToString(Formatting.None));
            }

            foreach (var picture in new[] { new { Id = "gear", Box = GearPictureBox }, new { Id = "name", Box = CharacterName_PictureBox }, new { Id = "level", Box = CharacterLevel_PictureBox },
                new { Id = "t0", Box = CharacterTalent1_PictureBox }, new { Id = "t1", Box = CharacterTalent2_PictureBox }, new { Id = "t2", Box = CharacterTalent3_PictureBox } })
            {
                var image = picture.Box.Image;
                if (webImages.TryGetValue(picture.Id, out var shown) && ReferenceEquals(shown, image)) continue;
                webImages[picture.Id] = image;
                string source = null;
                if (image != null)
                {
                    try { using (var buffer = new MemoryStream()) { image.Save(buffer, ImageFormat.Png); source = "data:image/png;base64," + Convert.ToBase64String(buffer.ToArray()); } }
                    catch (Exception error) when (error is ExternalException || error is ArgumentException || error is InvalidOperationException) { continue; }
                }
                core.PostWebMessageAsJson(new JObject { ["type"] = "image", ["id"] = picture.Id, ["src"] = source }.ToString(Formatting.None));
            }
        }
    }
}
