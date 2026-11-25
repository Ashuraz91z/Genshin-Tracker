using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Linq;
using System.Reflection;
using System.Windows.Forms;

namespace InventoryKamera
{
    public partial class MainForm
    {
        // Palette du site (web/app/globals.css) + quelques nuances HUD.
        private static readonly Color Night = Color.FromArgb(11,17,32), Surface = Color.FromArgb(18,28,46),
            Raised = Color.FromArgb(25,37,58), Ink = Color.FromArgb(237,242,247), Muted = Color.FromArgb(166,179,198),
            Gold = Color.FromArgb(231,191,124), Mint = Color.FromArgb(126,215,189),
            Line = Color.FromArgb(41,54,75), LineBright = Color.FromArgb(65,80,103), GoldHi = Color.FromArgb(246,211,153),
            Hover = Color.FromArgb(38,54,78), Warn = Color.FromArgb(74,56,22);
        private Label syncStatusLabel, syncProgressLabel, localScanHint;
        private TextBox siteAddress, pairingCode;
        private Timer hudTimer;

        // Bahnschrift est livrée avec Windows 10/11 ; sinon Windows la remplace par la police système.
        private static Font Hud(float size, bool strong = false) => new Font(strong ? "Bahnschrift SemiBold" : "Bahnschrift", size);
        private static Font Mono(float size) => new Font("Consolas", size);

        private static Label Caption(string text, int size = 10, Color? color = null)
        {
            return new Label { Text = text, AutoSize = false, Dock = DockStyle.Top, Height = size > 16 ? 42 : 30,
                Font = size > 16 ? Hud(size, true) : new Font("Segoe UI", size), ForeColor = color ?? Ink };
        }
        // Petit titre technique : « // TITRE » en Consolas.
        private static Label HudTag(string text, Color? color = null)
        {
            var label = Caption("// " + text, 9, color ?? Gold); label.Font = Mono(9); label.Height = 24; return label;
        }
        private static T Buffered<T>(T control) where T : Control
        {
            typeof(Control).GetProperty("DoubleBuffered", BindingFlags.NonPublic | BindingFlags.Instance).SetValue(control, true, null);
            return control;
        }
        private static Color BackOf(Control control)
        {
            for (var parent = control.Parent; parent != null; parent = parent.Parent) if (parent.BackColor.A == 255) return parent.BackColor;
            return Night;
        }
        // Cadre HUD : filet fin + équerres dorées aux coins (deux coins, ou quatre façon viseur).
        private static void Frame(Control control, Color accent, bool viewfinder = false, int corner = 16)
        {
            Buffered(control);
            control.Paint += (s, e) =>
            {
                int w = control.Width - 2, h = control.Height - 2;
                if (w < corner * 2 || h < corner * 2) return;
                using (var pen = new Pen(Line)) e.Graphics.DrawRectangle(pen, 0, 0, control.Width - 1, control.Height - 1);
                using (var pen = new Pen(accent, 2))
                {
                    e.Graphics.DrawLines(pen, new[] { new Point(1, corner), new Point(1, 1), new Point(corner, 1) });
                    e.Graphics.DrawLines(pen, new[] { new Point(w - corner, h), new Point(w, h), new Point(w, h - corner) });
                    if (!viewfinder) return;
                    e.Graphics.DrawLines(pen, new[] { new Point(w - corner, 1), new Point(w, 1), new Point(w, corner) });
                    e.Graphics.DrawLines(pen, new[] { new Point(1, h - corner), new Point(1, h), new Point(corner, h) });
                }
            };
            control.Resize += (s, e) => control.Invalidate();
            if (control is ScrollableControl scroll) { scroll.Scroll += (s, e) => control.Invalidate(); scroll.MouseWheel += (s, e) => control.Invalidate(); }
        }
        // Bouton à coins coupés, dessiné par-dessus le rendu Windows.
        private static Button Chamfer(Button button, bool primary)
        {
            bool hover = false;
            button.FlatStyle = FlatStyle.Flat; button.FlatAppearance.BorderSize = 0; button.Cursor = Cursors.Hand;
            button.Font = Hud(10.5f, true);
            EventHandler redraw = (s, e) => button.Invalidate();
            button.MouseEnter += (s, e) => { hover = true; button.Invalidate(); };
            button.MouseLeave += (s, e) => { hover = false; button.Invalidate(); };
            button.EnabledChanged += redraw; button.TextChanged += redraw; button.GotFocus += redraw; button.LostFocus += redraw;
            button.Paint += (s, e) =>
            {
                var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.Clear(BackOf(button));
                int w = button.Width - 1, h = button.Height - 1, k = Math.Max(6, Math.Min(12, h / 3));
                var shape = new[] { new Point(k, 0), new Point(w, 0), new Point(w, h - k), new Point(w - k, h), new Point(0, h), new Point(0, k) };
                Color fill = !button.Enabled ? Surface : primary ? (hover ? GoldHi : Gold) : (hover ? Hover : Raised);
                Color edge = !button.Enabled ? Line : primary ? GoldHi : (hover ? Gold : LineBright);
                using (var brush = new SolidBrush(fill)) g.FillPolygon(brush, shape);
                using (var pen = new Pen(edge)) g.DrawPolygon(pen, shape);
                if (!primary && button.Enabled) using (var pen = new Pen(Gold, 2)) g.DrawLine(pen, k + 4, 1, k + 22, 1);
                if (button.Focused) using (var pen = new Pen(primary ? Night : Mint) { DashStyle = DashStyle.Dot }) g.DrawRectangle(pen, k / 2 + 3, 4, w - k - 6, h - 8);
                TextRenderer.DrawText(g, button.Text, button.Font, new Rectangle(0, 0, button.Width, button.Height),
                    !button.Enabled ? Muted : primary ? Night : Ink, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
            };
            return button;
        }
        private static Button ActionButton(string text, bool primary = false)
        {
            var button = new Button { Text = text, AutoSize = false, Height = 44, Width = 180, Margin = new Padding(0, 8, 10, 8) };
            return Chamfer(button, primary);
        }
        private static FlowLayoutPanel Stack(int padding = 20)
        {
            return new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false,
                AutoScroll = true, Padding = new Padding(padding), BackColor = Surface, Margin = new Padding(0,0,16,0) };
        }
        private static void Style(Control control)
        {
            control.Font = new Font("Segoe UI", 10);
            control.ForeColor = Ink;
            if (control is TextBox text) { text.BackColor = Night; text.BorderStyle = BorderStyle.FixedSingle; }
            else if (control is NumericUpDown number) { number.BackColor = Raised; }
            else if (!(control is PictureBox)) control.BackColor = Surface;
            foreach (Control child in control.Controls) Style(child);
        }
        private Panel BuildHeader(Button connect)
        {
            var header = Buffered(new Panel { Dock = DockStyle.Fill, BackColor = Night, Padding = new Padding(0,10,0,0) });
            var title = new Label { Text = "KAMERA", AutoSize = true, Font = Hud(28, true), ForeColor = Ink, BackColor = Color.Transparent, Location = new Point(0, 8) };
            var badge = new Label { Text = "FR", AutoSize = false, Size = new Size(34, 22), TextAlign = ContentAlignment.MiddleCenter, Font = Mono(9),
                ForeColor = Night, BackColor = Gold };
            var subtitle = new Label { Text = "SCANNER WINDOWS  //  v0.6  //  GENSHIN TRACKER", AutoSize = true, Font = Mono(9), ForeColor = Muted,
                BackColor = Color.Transparent, Location = new Point(3, 60) };
            var status = new Label { AutoSize = true, Font = Mono(9), BackColor = Color.Transparent, Anchor = AnchorStyles.Top | AnchorStyles.Right };
            connect.Anchor = AnchorStyles.Top | AnchorStyles.Right; connect.Location = new Point(870, 16);
            header.Controls.AddRange(new Control[] { title, badge, subtitle, status, connect });
            void Place()
            {
                badge.Location = new Point(title.Right + 8, title.Top + 14);
                connect.Left = header.ClientSize.Width - connect.Width;
                status.Location = new Point(connect.Left - status.Width - 24, connect.Top + (connect.Height - status.Height) / 2);
            }
            title.SizeChanged += (s, e) => Place(); status.SizeChanged += (s, e) => Place(); header.Resize += (s, e) => Place(); Place();

            // Grille discrète, halo doré et faisceau de balayage sur le filet du bas (doré au repos, menthe pendant un scan).
            int beam = 0; bool wasRunning = !running;
            header.Paint += (s, e) =>
            {
                var g = e.Graphics; int w = header.Width, h = header.Height;
                using (var glow = new LinearGradientBrush(new Rectangle(0, 0, Math.Max(1, w / 2), h), Color.FromArgb(28, Gold), Color.FromArgb(0, Gold), 0f))
                    g.FillRectangle(glow, 0, 0, w / 2, h);
                using (var grid = new Pen(Color.FromArgb(16, Ink)))
                {
                    for (int x = w; x > w / 3; x -= 22) g.DrawLine(grid, x, 0, x, h - 4);
                    for (int y = 0; y < h - 4; y += 22) g.DrawLine(grid, w / 3, y, w, y);
                }
                using (var rail = new Pen(Line)) g.DrawLine(rail, 0, h - 2, w, h - 2);
                Color tint = running ? Mint : Gold; int x0 = beam - 180;
                using (var ray = new LinearGradientBrush(new Rectangle(x0, h - 3, 181, 3), Color.FromArgb(0, tint), tint, 0f))
                    g.FillRectangle(ray, x0, h - 3, 180, 3);
                using (var tick = new SolidBrush(Gold)) g.FillRectangle(tick, 0, h - 4, 40, 4);
            };
            hudTimer = new Timer { Interval = 33 };
            hudTimer.Tick += (s, e) =>
            {
                if (running != wasRunning)
                {
                    wasRunning = running;
                    status.Text = running ? "●  SCAN EN COURS" : "●  SYSTÈME PRÊT";
                    status.ForeColor = running ? Gold : Mint;
                }
                beam = (beam + (running ? 14 : 5)) % (header.Width + 180);
                header.Invalidate(new Rectangle(0, header.Height - 5, header.Width, 5));
            };
            hudTimer.Start();
            FormClosed += (s, e) => hudTimer.Dispose();
            return header;
        }
        // Carte de compteur : cadre HUD + jauge en bas quand le maximum est connu.
        private static Panel StatCard(string title, Label value, Label max)
        {
            var card = new Panel { Dock = DockStyle.Fill, BackColor = Surface, Padding = new Padding(18,10,18,14), Margin = new Padding(0,0,12,0) };
            Frame(card, Gold);
            var label = HudTag(title, Muted); label.BackColor = Surface;
            value.Dock = DockStyle.Fill; value.AutoSize = false; value.Font = Hud(28, true); value.ForeColor = Gold; value.BackColor = Surface;
            card.Controls.Add(value);
            if (max != null)
            {
                max.Dock = DockStyle.Right; max.AutoSize = false; max.Width = 70; max.Font = Mono(10); max.ForeColor = Muted; max.BackColor = Surface;
                max.TextAlign = ContentAlignment.BottomRight; card.Controls.Add(max);
                max.TextChanged += (s, e) => card.Invalidate(); value.TextChanged += (s, e) => card.Invalidate();
            }
            card.Controls.Add(label);
            card.Paint += (s, e) =>
            {
                int bars = 24, left = 18, width = card.Width - 36, y = card.Height - 9; if (width < bars * 3) return;
                double ratio = 0;
                if (max != null && int.TryParse(value.Text.Trim(), out int got) && int.TryParse(max.Text.Trim().TrimStart('/').Trim(), out int top) && top > 0)
                    ratio = Math.Min(1, (double)got / top);
                float step = width / (float)bars;
                for (int i = 0; i < bars; i++)
                    using (var brush = new SolidBrush(i < Math.Round(ratio * bars) ? Mint : Line)) e.Graphics.FillRectangle(brush, left + i * step, y, step - 3, 3);
            };
            return card;
        }
        private void ApplyTrackerDesign()
        {
            SuspendLayout();
            Style(this);
            Controls.Clear();
            DoubleBuffered = true;
            BackColor = Night; Font = new Font("Segoe UI",10); MinimumSize = new Size(1080,760); Size = new Size(1280,900);
            StartPosition = FormStartPosition.CenterScreen; FormBorderStyle = FormBorderStyle.Sizable; MaximizeBox = true;
            var root = new TableLayoutPanel { Dock = DockStyle.Fill, BackColor = Night, Padding = new Padding(26,12,26,20), ColumnCount = 1, RowCount = 4 };
            root.RowStyles.Add(new RowStyle(SizeType.Absolute,28)); root.RowStyles.Add(new RowStyle(SizeType.Absolute,108));
            root.RowStyles.Add(new RowStyle(SizeType.Percent,100)); root.RowStyles.Add(new RowStyle(SizeType.Absolute,68));
            menuStrip1.Dock = DockStyle.Fill; menuStrip1.BackColor = Night; menuStrip1.ForeColor = Muted; root.Controls.Add(menuStrip1,0,0);
            var connect = ActionButton("Connexion au site");
            root.Controls.Add(BuildHeader(connect),0,1);
            var body = new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=2,RowCount=1,BackColor=Night,Margin=new Padding(0,14,0,0)};
            body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,280));body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));root.Controls.Add(body,0,2);
            var settings = Stack(); Frame(settings, Gold); body.Controls.Add(settings,0,0);
            foreach(var label in new[]{HudTag("SCAN LOCAL"),Caption("Préparer le scan",19),Caption("Un scan peut viser une seule catégorie.",9,Muted)}) {label.Width=220;settings.Controls.Add(label);}
            foreach(var check in new[]{Characters_CheckBox,Weapons_CheckBox,Artifacts_Checkbox,CharDevItems_CheckBox,Materials_CheckBox})
            {check.AutoSize=false;check.Width=220;check.Height=36;check.Margin=new Padding(0,2,0,2);settings.Controls.Add(check);}
            var delayTitle=HudTag("VITESSE DE NAVIGATION",Muted);delayTitle.Width=220;delayTitle.Margin=new Padding(0,18,0,0);settings.Controls.Add(delayTitle);
            ScannerDelay_TrackBar.Width=220;ScannerDelay_TrackBar.Height=38;settings.Controls.Add(ScannerDelay_TrackBar);
            var delayHelp=Caption("RAPIDE           MODÉRÉ             LENT",8,Muted);delayHelp.Font=Mono(8);delayHelp.Width=220;settings.Controls.Add(delayHelp);
            var launch=Chamfer(StartScan_Button,true);launch.Width=220;launch.Height=52;launch.Font=Hud(12,true);launch.Margin=new Padding(0,18,0,6);settings.Controls.Add(launch);
            var stop=Caption("ENTRÉE pour arrêter le scan",9,Muted);stop.Width=220;settings.Controls.Add(stop);
            var options=HudTag("AVANT DE COMMENCER");options.Width=220;options.Margin=new Padding(0,20,0,4);settings.Controls.Add(options);
            var checklist=Caption("1. Ouvrez le menu Paimon.\n2. Lancez le scan puis Alt+Tab.\n3. Gardez Genshin au premier plan.\n\nJeu en français • HDR désactivé\nFormat 16:9 ou 16:10",10,Muted);checklist.Width=220;checklist.Height=180;settings.Controls.Add(checklist);
            var content=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=3,ColumnCount=1,BackColor=Night};content.RowStyles.Add(new RowStyle(SizeType.Absolute,62));content.RowStyles.Add(new RowStyle(SizeType.Absolute,116));content.RowStyles.Add(new RowStyle(SizeType.Percent,100));body.Controls.Add(content,1,0);
            localScanHint=Caption("Aucun scan effectué dans cette session. Les compteurs ci-dessous concernent uniquement ce PC.\nLes données enregistrées sur le site sont disponibles dans Mon compte.",10,Muted);localScanHint.Dock=DockStyle.Fill;content.Controls.Add(localScanHint,0,0);
            var stats = new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=3,BackColor=Night,Margin=new Padding(0,0,0,16)};
            foreach(var item in new[]{new{Title="PERSONNAGES",Value=CharactersScanned_Label,Max=(Label)null},new{Title="ARMES",Value=WeaponsScannedCount_Label,Max=WeaponsMax_Labell},new{Title="ARTÉFACTS",Value=ArtifactsScanned_Label,Max=ArtifactsMax_Label}})
            {stats.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,33.333f));stats.Controls.Add(StatCard(item.Title,item.Value,item.Max));}
            content.Controls.Add(stats,0,1);
            var tabs=new TabControl{Dock=DockStyle.Fill,Font=Hud(10),Padding=new Point(18,10),DrawMode=TabDrawMode.OwnerDrawFixed,SizeMode=TabSizeMode.Fixed,Multiline=true,ItemSize=new Size(140,42)};
            tabs.DrawItem+=(sender,e)=>{
                bool selected=e.Index==tabs.SelectedIndex;var g=e.Graphics;
                if(e.Index==tabs.TabCount-1)using(var strip=new SolidBrush(Night))g.FillRectangle(strip,e.Bounds.Right,e.Bounds.Top-2,tabs.Width,e.Bounds.Height+4);
                using(var brush=new SolidBrush(selected?Surface:Night))g.FillRectangle(brush,e.Bounds);
                if(selected){using(var pen=new Pen(Gold,2))g.DrawLine(pen,e.Bounds.Left+1,e.Bounds.Top+1,e.Bounds.Right-1,e.Bounds.Top+1);
                    using(var dot=new SolidBrush(Gold))g.FillRectangle(dot,e.Bounds.Left+14,e.Bounds.Top+e.Bounds.Height/2-3,6,6);}
                else using(var pen=new Pen(Line))g.DrawRectangle(pen,e.Bounds.Left,e.Bounds.Top,e.Bounds.Width-1,e.Bounds.Height-1);
                TextRenderer.DrawText(g,tabs.TabPages[e.Index].Text.ToUpperInvariant(),tabs.Font,e.Bounds,selected?Gold:Muted,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);
                if((e.State&DrawItemState.Focus)!=0)e.DrawFocusRectangle();};
            var live=new TabPage("Scan en direct"){BackColor=Surface,Padding=new Padding(18)};
            var errors=new TabPage("Journal"){BackColor=Surface,Padding=new Padding(18)};
            var optionsPage=new TabPage("Options"){BackColor=Surface,Padding=new Padding(18)};
            var connection=new TabPage("Connexion"){BackColor=Surface,Padding=new Padding(22)};
            var accountPage = BuildAccountPage();
            tabs.TabPages.AddRange(new[]{live,errors,optionsPage,connection,accountPage});content.Controls.Add(tabs,0,2);connect.Click+=(s,e)=>tabs.SelectedTab=connection;
            foreach(TabPage page in tabs.TabPages)Frame(page,Color.FromArgb(120,Gold));
            var liveGrid=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=3,BackColor=Surface};liveGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,45));liveGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,55));
            liveGrid.RowStyles.Add(new RowStyle(SizeType.Absolute,34));liveGrid.RowStyles.Add(new RowStyle(SizeType.Percent,52));liveGrid.RowStyles.Add(new RowStyle(SizeType.Percent,48));
            liveGrid.Controls.Add(HudTag("ÉQUIPEMENT EN COURS"),0,0);liveGrid.Controls.Add(HudTag("PERSONNAGE ET APTITUDES"),1,0);
            GearPictureBox.Dock=DockStyle.Fill;GearPictureBox.SizeMode=PictureBoxSizeMode.Zoom;GearPictureBox.BackColor=Night;GearPictureBox.Margin=new Padding(0,0,16,12);Frame(GearPictureBox,Mint,true,22);liveGrid.Controls.Add(GearPictureBox,0,1);
            var samples=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,RowCount=3};for(int i=0;i<3;i++)samples.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,33.333f));
            foreach(var pair in new[]{new{Box=CharacterName_PictureBox,Row=0},new{Box=CharacterLevel_PictureBox,Row=1}}){pair.Box.Dock=DockStyle.Fill;pair.Box.SizeMode=PictureBoxSizeMode.Zoom;pair.Box.BackColor=Night;Frame(pair.Box,Mint,true,10);samples.Controls.Add(pair.Box,0,pair.Row);samples.SetColumnSpan(pair.Box,3);}
            int column=0;foreach(var picture in new[]{CharacterTalent1_PictureBox,CharacterTalent2_PictureBox,CharacterTalent3_PictureBox}){picture.Dock=DockStyle.Fill;picture.SizeMode=PictureBoxSizeMode.Zoom;picture.BackColor=Night;Frame(picture,Mint,true,10);samples.Controls.Add(picture,column++,2);}liveGrid.Controls.Add(samples,1,1);
            foreach(var text in new[]{ArtifactOutput_TextBox,CharacterOutput_TextBox}){text.Dock=DockStyle.Fill;text.Multiline=true;text.ScrollBars=ScrollBars.Vertical;text.Font=Mono(9);text.ReadOnly=true;text.BackColor=Night;text.ForeColor=Mint;text.Margin=new Padding(0,0,12,0);}
            liveGrid.Controls.Add(ArtifactOutput_TextBox,0,2);liveGrid.Controls.Add(CharacterOutput_TextBox,1,2);live.Controls.Add(liveGrid);
            ErrorLog_TextBox.Dock=DockStyle.Fill;ErrorLog_TextBox.Multiline=true;ErrorLog_TextBox.ScrollBars=ScrollBars.Vertical;ErrorLog_TextBox.Font=Mono(10);ErrorLog_TextBox.ReadOnly=true;ErrorLog_TextBox.WordWrap=false;ErrorLog_TextBox.ScrollBars=ScrollBars.Both;ErrorLog_TextBox.BackColor=Night;ErrorLog_TextBox.ForeColor=Mint;
            var errorTitle=Caption("Journal du scanner",18,Ink);errorTitle.Height=42;
            var journalHelp=Caption("Scan, OCR et synchronisation • les erreurs sont conservées dans le rapport.",10,Muted);journalHelp.Height=36;
            var journalActions=new FlowLayoutPanel{Dock=DockStyle.Bottom,Height=60,BackColor=Surface,WrapContents=false};
            var copyJournal=ActionButton("Copier le journal");webButtons["copyLog"]=copyJournal;copyJournal.Click+=(s,e)=>{if(ErrorLog_TextBox.TextLength>0){try{Clipboard.SetText(ErrorLog_TextBox.Text);syncProgressLabel.Text="Journal copié dans le presse-papiers.";}catch(System.Runtime.InteropServices.ExternalException){syncProgressLabel.Text="Presse-papiers occupé. Réessayez dans un instant.";}}};
            var openJournal=ActionButton("Ouvrir les logs");webButtons["openLogs"]=openJournal;openJournal.Click+=(s,e)=>{try{System.Diagnostics.Process.Start(System.IO.Path.GetFullPath("logging"));}catch(Exception ex){UserInterface.Trace("Impossible d’ouvrir les logs : "+ex.Message);}};
            journalActions.Controls.AddRange(new Control[]{copyJournal,openJournal});errors.Controls.Add(ErrorLog_TextBox);errors.Controls.Add(journalActions);errors.Controls.Add(journalHelp);errors.Controls.Add(errorTitle);
            var optionsStack=Stack(0);optionsStack.Margin=new Padding(0);optionsPage.Controls.Add(optionsStack);
            AddSection(optionsStack,"01  /  ÉQUIPEMENTS", "Les filtres limitent les pièces relevées ; les autres données du compte sont conservées.");
            AddSetting(optionsStack,"Rareté minimale des armes",WeaponRarityControl);AddSetting(optionsStack,"Rareté minimale des artéfacts",ArtifactRarityControl);
            AddSetting(optionsStack,"Niveau minimal des armes",MinimumWeaponLevelControl);AddSetting(optionsStack,"Niveau minimal des artéfacts",numericUpDown1);
            AddSection(optionsStack,"02  /  PERSONNAGES", "Utilisez les noms personnalisés visibles dans votre jeu.");
            AddSetting(optionsStack,"Nom du Voyageur",travelerNameTextBox);AddSetting(optionsStack,"Nom personnalisé du Nomade",wandererNameTextBox);
            foreach(var check in new[]{EquipWeaponsCheckBox,EquipArtifactsCheckBox,LogScreenshotsCheckBox}){check.AutoSize=true;check.Margin=new Padding(0,12,0,0);optionsStack.Controls.Add(check);}
            AddSection(optionsStack,"03  /  EXPORTS ET DIAGNOSTIC", "Chaque scan produit un fichier GOOD et son rapport de lecture.");
            AddSetting(optionsStack,"Dossier des exports",OutputPath_TextBox);Chamfer(FileSelectButton,false);FileSelectButton.Width=130;FileSelectButton.Height=36;optionsStack.Controls.Add(FileSelectButton);
            var exportButton=ActionButton("Ouvrir les exports");webButtons["openExports"]=exportButton;exportButton.Click+=ExportFolderMenuItem_Click;optionsStack.Controls.Add(exportButton);
            Chamfer(ManualExportButton,false);ManualExportButton.Width=220;ManualExportButton.Height=44;ManualExportButton.Text="Exporter vers Optimizer";optionsStack.Controls.Add(ManualExportButton);
            Navigation_Image.Width=160;Navigation_Image.Height=70;Navigation_Image.SizeMode=PictureBoxSizeMode.Zoom;optionsStack.Controls.Add(Navigation_Image);
            var info=Caption("Le jeu doit rester en français, en 16:9 ou 16:10, HDR désactivé.",9,Muted);info.Width=620;info.Height=45;optionsStack.Controls.Add(info);
            var connectionStack=Stack(0);connectionStack.Margin=new Padding(0);connection.Controls.Add(connectionStack);
            foreach(var label in new[]{HudTag("02  /  SYNCHRONISATION"),Caption("Du jeu à votre carnet",22),Caption("Connectez-vous une seule fois. Le PC reste relié à votre compte.",10,Muted)}){label.Width=620;connectionStack.Controls.Add(label);}
            connectedAccountLabel=Caption("",11,Mint);connectedAccountLabel.Width=620;connectedAccountLabel.Height=70;connectionStack.Controls.Add(connectedAccountLabel);
            changeAccountButton=ActionButton("Changer de compte / se reconnecter");changeAccountButton.Width=320;
            changeAccountButton.Click+=(s,e)=>{if(running||connectionBusy){syncStatusLabel.Text="Attendez la fin du scan ou de la connexion avant de changer de compte.";return;}UpdateConnectionView(true);siteAddress.Focus();};connectionStack.Controls.Add(changeAccountButton);
            connectionForm=new FlowLayoutPanel{FlowDirection=FlowDirection.TopDown,WrapContents=false,AutoSize=true,AutoSizeMode=AutoSizeMode.GrowAndShrink,Width=620,BackColor=Surface,Margin=new Padding(0),Padding=new Padding(0)};connectionStack.Controls.Add(connectionForm);
            siteAddress=new TextBox{Text=ClientSync.SiteUrl,Width=560,BackColor=Night,ForeColor=Ink};pairingCode=new TextBox{Width=560,BackColor=Night,ForeColor=Gold};
            AddSetting(connectionForm,"Adresse HTTPS du site",siteAddress);
            AddLoginControls(connectionForm);
            var alternative=Caption("Autre méthode : un code temporaire créé sur le site (une seule fois).",9,Muted);alternative.Width=620;alternative.Height=48;connectionForm.Controls.Add(alternative);
            AddSetting(connectionForm,"Code d’association (valable 10 minutes)",pairingCode);
            var pairButton=ActionButton("Associer mon compte",true);webButtons["pair"]=pairButton;pairButton.Width=220;pairButton.Click+=async(s,e)=>{if(running||connectionBusy){syncStatusLabel.Text="Attendez la fin du scan avant de changer de compte.";return;}pairButton.Enabled=false;connectionBusy=true;try{await ClientSync.Pair(siteAddress.Text,pairingCode.Text);pairingCode.Clear();}catch(Exception ex){UserInterface.Trace("Connexion refusée : "+ex.Message);syncStatusLabel.Text=ex.Message;syncStatusLabel.ForeColor=Color.Salmon;}finally{pairButton.Enabled=true;connectionBusy=false;}};connectionForm.Controls.Add(pairButton);
            cancelConnectionButton=ActionButton("Garder le compte actuel");cancelConnectionButton.Width=260;cancelConnectionButton.Click+=(s,e)=>{if(!connectionBusy){ClearConnectionSecrets();UpdateConnectionView(false);}};connectionForm.Controls.Add(cancelConnectionButton);
            UpdateConnectionView(false);
            connect.Text=ClientSync.AccountName==null?"Connexion au site":"Compte : "+ClientSync.AccountName;
            var sendFile=ActionButton("Envoyer un fichier GOOD existant");webButtons["sendFile"]=sendFile;sendFile.Width=320;sendFile.Click+=(s,e)=>{
                if(running||connectionBusy){syncStatusLabel.Text="Attendez la fin du scan ou de la connexion.";return;}
                using(var file=new OpenFileDialog{Filter="Fichier GOOD (*.json)|*.json",Title="Choisissez le fichier GOOD, pas son rapport"})
                {
                    if(file.ShowDialog(this)!=DialogResult.OK)return;
                    if(MessageBox.Show(this,"Envoyer ce fichier au compte « "+ClientSync.AccountName+" » sur "+ClientSync.SiteUrl+" ?", "Envoyer le relevé existant",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)return;
                    try{ClientSync.SendExisting(file.FileName);}catch(Exception ex){syncStatusLabel.Text=ex.Message;UserInterface.Trace(ex.Message);}
                }
            };connectionStack.Controls.Add(sendFile);
            var retry=ActionButton("Réessayer l’envoi");webButtons["retry"]=retry;retry.Width=220;retry.Click+=async(s,e)=>{retry.Enabled=false;try{await ClientSync.SendPending();}finally{retry.Enabled=true;}};connectionStack.Controls.Add(retry);
            syncStatusLabel=Caption(ClientSync.AccountName==null?"Aucun compte associé. Les exports restent enregistrés sur ce PC.":"Compte associé : "+ClientSync.AccountName,10,Muted);syncStatusLabel.Width=620;syncStatusLabel.Height=90;syncStatusLabel.Margin=new Padding(0,20,0,12);connectionStack.Controls.Add(syncStatusLabel);
            var privacy=Caption("La clé d’accès est protégée par votre session Windows. Les scans hors ligne restent en attente. Vous pouvez dissocier ce PC depuis le site.",9,Muted);privacy.Width=620;privacy.Height=80;connectionStack.Controls.Add(privacy);
            ClientSync.StatusChanged=(text,ok)=>{if(!IsDisposed&&IsHandleCreated)BeginInvoke((MethodInvoker)(()=>{syncStatusLabel.Text=text;syncStatusLabel.ForeColor=ok?Mint:Color.Salmon;if(syncProgressLabel!=null){syncProgressLabel.Text=text;syncProgressLabel.ForeColor=ok?Mint:Color.Salmon;}RefreshConnectionAccess();connect.Text=ClientSync.AccountName==null?"Connexion au site":"Compte : "+ClientSync.AccountName;}));};
            StartAccountRefresh();
            var footer=Buffered(new Panel{Dock=DockStyle.Fill,BackColor=Night,Padding=new Padding(16,15,0,0)});
            footer.Paint+=(s,e)=>{using(var rail=new Pen(Line))e.Graphics.DrawLine(rail,0,4,footer.Width,4);using(var tick=new SolidBrush(Gold))e.Graphics.FillRectangle(tick,0,3,40,3);using(var dot=new SolidBrush(running?Gold:Mint))e.Graphics.FillRectangle(dot,0,26,6,6);};
            ProgramStatus_Label.AutoSize=false;ProgramStatus_Label.Dock=DockStyle.Top;ProgramStatus_Label.Height=30;ProgramStatus_Label.BackColor=Night;ProgramStatus_Label.Font=Hud(11);
            ProgramStatus_Label.TextChanged+=(s,e)=>footer.Invalidate();
            syncProgressLabel=Caption("Les envois et accusés de réception apparaîtront ici.",9,Muted);syncProgressLabel.Font=Mono(9);syncProgressLabel.Dock=DockStyle.Bottom;syncProgressLabel.Height=22;footer.Controls.Add(syncProgressLabel);footer.Controls.Add(ProgramStatus_Label);root.Controls.Add(footer,0,3);
            Controls.Add(root);ResumeLayout(true);
        }
        private static void AddSection(FlowLayoutPanel panel,string title,string help)
        {
            var heading=HudTag(title);heading.Width=520;heading.Margin=new Padding(0,22,0,4);panel.Controls.Add(heading);
            var description=Caption(help,10,Muted);description.Width=520;description.Height=48;panel.Controls.Add(description);
        }
        private static void AddSetting(FlowLayoutPanel panel,string name,Control control)
        {
            var label=Caption(name,9,Muted);label.Width=560;label.Margin=new Padding(0,14,0,2);panel.Controls.Add(label);
            control.Margin=new Padding(0,0,0,3);control.MinimumSize=new Size(0,28);control.Width=control is NumericUpDown?120:520;panel.Controls.Add(control);
        }
    }
}
