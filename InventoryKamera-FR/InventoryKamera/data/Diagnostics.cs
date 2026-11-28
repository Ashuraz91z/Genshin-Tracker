using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace InventoryKamera
{
    internal sealed class UpdateInfo { public string Version, Url; }

    /// <summary>Update check against the project's public GitHub releases, and the bug-report bundle.</summary>
    internal static class Diagnostics
    {
        internal const string Repo = "Ashuraz91z/Genshin-Tracker";
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        internal static string CurrentVersion => Assembly.GetExecutingAssembly().GetName().Version.ToString(3);

        // Reads the latest public release; nothing about the user or the PC is sent (a plain GET with a generic client name).
        // The release is only announced: the user downloads it from the release page, nothing is installed automatically.
        internal static async Task<UpdateInfo> CheckForUpdate()
        {
            try
            {
                ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
                using (var client = new HttpClient { Timeout = TimeSpan.FromSeconds(8) })
                {
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("KameraFR/" + CurrentVersion);
                    client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
                    var release = JObject.Parse(await client.GetStringAsync("https://api.github.com/repos/" + Repo + "/releases/latest"));
                    string url = (string)release["html_url"];
                    if (url == null || !url.StartsWith("https://github.com/" + Repo + "/")) return null;
                    foreach (var asset in release["assets"] as JArray ?? new JArray())
                    {
                        var match = Regex.Match((string)asset["name"] ?? "", @"^GenshinTracker-KameraFR-(\d+\.\d+\.\d+)\.zip$");
                        if (match.Success && Version.TryParse(match.Groups[1].Value, out var latest) && latest > new Version(CurrentVersion))
                            return new UpdateInfo { Version = latest.ToString(3), Url = url };
                    }
                }
            }
            catch (Exception error) when (error is HttpRequestException || error is TaskCanceledException || error is Newtonsoft.Json.JsonException || error is InvalidOperationException)
            {
                Logger.Debug("Vérification de mise à jour impossible : {0}", error.Message);
            }
            return null;
        }

        // Bundle for a bug report: version, settings, logs (account name, UID, PC and Windows user names hidden). No captures, no password.
        internal static string CreateBugReport(string journal, out string issueUrl)
        {
            var secrets = new List<string>();
            void Hide(string value) { if (!string.IsNullOrWhiteSpace(value) && value.Trim().Length >= 3) secrets.Add(value.Trim()); }
            Hide(ClientSync.AccountName); Hide(ProfileScraper.Nickname); Hide(ProfileScraper.Uid); Hide(Environment.UserName); Hide(Environment.MachineName);
            string Clean(string text) { foreach (var secret in secrets) text = Regex.Replace(text ?? "", Regex.Escape(secret), "***", RegexOptions.IgnoreCase); return text; }

            string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Kamera-rapport-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".zip");
            var settings = Properties.Settings.Default;
            var info = new StringBuilder();
            info.AppendLine("Kamera FR " + CurrentVersion);
            info.AppendLine("Windows : " + Environment.OSVersion.VersionString + (Environment.Is64BitOperatingSystem ? " (64 bits)" : " (32 bits)"));
            try { info.AppendLine("Résolution du jeu : " + Navigation.GetWidth() + "x" + Navigation.GetHeight()); } catch (Exception) { info.AppendLine("Résolution du jeu : inconnue (jeu non détecté)"); }
            info.AppendLine("Langue du jeu : " + (GameLanguage.IsFrench ? "FR" : "EN"));
            foreach (var name in new[] { "ScannerDelay", "ScanCharacters", "ScanWeapons", "ScanArtifacts", "ScanMaterials", "ScanProfile", "ScanQuests", "MinimumWeaponRarity", "MinimumArtifactRarity", "LogScreenshots" })
                info.AppendLine(name + " = " + settings[name]);

            using (var zip = new ZipArchive(File.Create(path), ZipArchiveMode.Create))
            {
                void Add(string name, string content)
                {
                    var entry = zip.CreateEntry(name);
                    using (var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false))) writer.Write(Clean(content));
                }
                Add("infos.txt", info.ToString());
                Add("journal-erreurs.txt", journal);
                foreach (var file in new[] { "InventoryKamera.log", "InventoryKamera.debug.log" })
                {
                    string source = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logging", file);
                    if (!File.Exists(source)) continue;
                    using (var stream = new FileStream(source, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    {
                        const int limit = 2 * 1024 * 1024; // the end of the log is what matters
                        if (stream.Length > limit) stream.Seek(-limit, SeekOrigin.End);
                        using (var reader = new StreamReader(stream, Encoding.UTF8)) Add(file, reader.ReadToEnd());
                    }
                }
            }
            issueUrl = "https://github.com/" + Repo + "/issues/new?template=bug.yml&version=" + Uri.EscapeDataString(CurrentVersion)
                + "&title=" + Uri.EscapeDataString("[Kamera " + CurrentVersion + "] ");
            return path;
        }
    }
}
