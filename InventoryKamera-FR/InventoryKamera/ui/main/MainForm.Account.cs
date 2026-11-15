using System;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;
using Newtonsoft.Json.Linq;

namespace InventoryKamera
{
    public partial class MainForm
    {
        private Label accountSummary;
        private DataGridView accountCharacters;
        private TextBox accountHistory;
        private Timer accountTimer;
        private bool connectionBusy;

        private TabPage BuildAccountPage()
        {
            var page = new TabPage("Mon compte") { BackColor = Surface, Padding = new Padding(18) };
            var layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 4 };
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 80));
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 60));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 40));
            accountSummary = Caption("Connectez-vous pour afficher les données enregistrées sur le site. Aucun inventaire n’a encore été chargé.", 10, Muted);
            accountSummary.Dock = DockStyle.Fill;
            layout.Controls.Add(accountSummary, 0, 0);
            var refresh = ActionButton("Actualiser le compte");
            refresh.Click += async (s,e) => { refresh.Enabled=false; try { await ClientSync.RefreshAccount(); } finally { refresh.Enabled=true; } };
            layout.Controls.Add(refresh, 0, 1);
            accountCharacters = new DataGridView { Dock = DockStyle.Fill, ReadOnly = true, AllowUserToAddRows = false, AllowUserToDeleteRows = false,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill, RowHeadersVisible = false, BackgroundColor = Night,
                BorderStyle = BorderStyle.None, EnableHeadersVisualStyles = false };
            accountCharacters.DefaultCellStyle.BackColor = Surface; accountCharacters.DefaultCellStyle.ForeColor = Ink;
            accountCharacters.ColumnHeadersDefaultCellStyle.BackColor = Raised; accountCharacters.ColumnHeadersDefaultCellStyle.ForeColor = Gold;
            foreach (var title in new[] { "Personnage (GOOD)", "Niveau", "Constellation", "Attaque", "Compétence", "Déchaînement" }) accountCharacters.Columns.Add(title,title);
            layout.Controls.Add(accountCharacters, 0, 2);
            accountHistory = new TextBox { Dock = DockStyle.Fill, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical,
                BackColor = Night, ForeColor = Ink, Font = new Font("Consolas",9), Text = "Les derniers scans reçus par le site apparaîtront ici." };
            layout.Controls.Add(accountHistory, 0, 3); page.Controls.Add(layout);
            ClientSync.AccountChanged = result => { if (!IsDisposed && IsHandleCreated) BeginInvoke((MethodInvoker)(() => ShowAccount(result))); };
            return page;
        }
        private void ShowAccount(JObject account)
        {
            if (account == null) { accountSummary.Text="Connexion mise à jour. Chargement des données du compte…";accountCharacters.Rows.Clear();accountHistory.Clear();return; }
            var data = account["data"];
            accountSummary.Text = "Compte : " + account["user"]?["name"] + " · Données enregistrées sur le site" + Environment.NewLine
                + (data?["characters"]?.Count() ?? 0) + " personnages · " + (data?["weapons"]?.Count() ?? 0) + " armes · "
                + (data?["artifacts"]?.Count() ?? 0) + " artéfacts · " + (data?["materials"]?.Count() ?? 0) + " types de matériaux" + Environment.NewLine
                + "Dernière réception : " + ((string)data?["updatedAt"] ?? "aucune") + ". Les lectures OCR restent à vérifier.";
            accountCharacters.Rows.Clear();
            foreach (var character in (data?["characters"] as JArray ?? new JArray()).OrderByDescending(c => (int?)c["level"] ?? 0))
                accountCharacters.Rows.Add((string)character["key"], (int?)character["level"], (int?)character["constellation"],
                    (int?)character["talent"]?["auto"], (int?)character["talent"]?["skill"], (int?)character["talent"]?["burst"]);
            accountHistory.Text = "DERNIERS RELEVÉS REÇUS PAR LE SITE" + Environment.NewLine;
            foreach (var scan in account["scans"] as JArray ?? new JArray())
            {
                accountHistory.AppendText((string)scan["received"] + " · " + (string)scan["device"] + " · " + (string)scan["report"]?["status"] + Environment.NewLine);
                foreach (string line in SyncSummary.Describe((JObject)scan)) accountHistory.AppendText("  " + line + Environment.NewLine);
                foreach (var step in scan["report"]?["events"] as JArray ?? new JArray()) accountHistory.AppendText("  " + step["at"] + " · " + step["message"] + Environment.NewLine);
                foreach (var error in scan["report"]?["errors"] as JArray ?? new JArray()) accountHistory.AppendText("  Erreur : " + (string)error + Environment.NewLine);
                foreach (var partial in scan["report"]?["partialCharacters"] as JArray ?? new JArray()) accountHistory.AppendText("  Personnage incomplet : " + partial["key"] + " (hors inventaire valide)" + Environment.NewLine);
            }
        }
        private void AddLoginControls(FlowLayoutPanel panel)
        {
            var name = new TextBox { Width=560, BackColor=Night, ForeColor=Ink, Text=ClientSync.AccountName??"" };
            var password = new TextBox { Width=560, BackColor=Night, ForeColor=Ink, UseSystemPasswordChar=true };
            AddSetting(panel,"Pseudo du compte du tracker",name); AddSetting(panel,"Mot de passe du tracker (différent de HoYoverse)",password);
            var login=ActionButton("Se connecter",true);login.Width=220;
            login.Click += async (s,e) => {
                if(running||connectionBusy) { syncStatusLabel.Text="Attendez la fin du scan avant de changer de compte."; return; }
                login.Enabled=false;connectionBusy=true;
                try { await ClientSync.Login(siteAddress.Text,name.Text,password.Text); }
                catch(Exception ex) { syncStatusLabel.Text=ex.Message;syncStatusLabel.ForeColor=Color.Salmon;UserInterface.Trace("Connexion refusée : "+ex.Message); }
                finally { password.Clear();login.Enabled=true;connectionBusy=false; }
            };
            panel.Controls.Add(login);
        }
        private void StartAccountRefresh()
        {
            accountTimer=new Timer { Interval=30000 };
            bool refreshing=false;
            accountTimer.Tick += async(s,e) => { if(refreshing||running||ClientSync.AccountName==null)return;refreshing=true;try{await ClientSync.RefreshAccount();}finally{refreshing=false;} };
            accountTimer.Start();
            FormClosed += (s,e) => { accountTimer.Dispose();ClientSync.AccountChanged=null;ClientSync.StatusChanged=null; };
        }
    }
}
