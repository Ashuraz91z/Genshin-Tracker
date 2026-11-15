using System;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;

namespace InventoryKamera
{
    public partial class MainForm
    {
        private static readonly Color Night = Color.FromArgb(11,17,32), Surface = Color.FromArgb(18,28,46),
            Raised = Color.FromArgb(25,37,58), Ink = Color.FromArgb(237,242,247), Muted = Color.FromArgb(166,179,198),
            Gold = Color.FromArgb(231,191,124), Mint = Color.FromArgb(126,215,189);
        private Label syncStatusLabel;
        private TextBox siteAddress, pairingCode;

        private static Label Caption(string text, int size = 10, Color? color = null)
        {
            return new Label { Text = text, AutoSize = false, Dock = DockStyle.Top, Height = size > 16 ? 42 : 30,
                Font = new Font("Segoe UI", size, size > 16 ? FontStyle.Bold : FontStyle.Regular), ForeColor = color ?? Ink };
        }
        private static Button ActionButton(string text, bool primary = false)
        {
            var button = new Button { Text = text, AutoSize = false, Height = 44, Width = 180, FlatStyle = FlatStyle.Flat,
                BackColor = primary ? Gold : Raised, ForeColor = primary ? Night : Ink, Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Margin = new Padding(0, 8, 10, 8), Cursor = Cursors.Hand };
            button.FlatAppearance.BorderColor = primary ? Gold : Color.FromArgb(65,80,103);
            button.FlatAppearance.MouseOverBackColor = primary ? Color.FromArgb(246,211,153) : Color.FromArgb(38,54,78);
            return button;
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
        private void ApplyTrackerDesign()
        {
            SuspendLayout();
            Style(this);
            Controls.Clear();
            BackColor = Night; Font = new Font("Segoe UI",10); MinimumSize = new Size(1024,760); Size = new Size(1220,870);
            StartPosition = FormStartPosition.CenterScreen; FormBorderStyle = FormBorderStyle.Sizable; MaximizeBox = true;
            var root = new TableLayoutPanel { Dock = DockStyle.Fill, BackColor = Night, Padding = new Padding(26,12,26,20), ColumnCount = 1, RowCount = 4 };
            root.RowStyles.Add(new RowStyle(SizeType.Absolute,28)); root.RowStyles.Add(new RowStyle(SizeType.Absolute,105));
            root.RowStyles.Add(new RowStyle(SizeType.Percent,100)); root.RowStyles.Add(new RowStyle(SizeType.Absolute,68));
            menuStrip1.Dock = DockStyle.Fill; menuStrip1.BackColor = Night; menuStrip1.ForeColor = Muted; root.Controls.Add(menuStrip1,0,0);
            var header = new Panel { Dock = DockStyle.Fill, BackColor = Night, Padding = new Padding(0,10,0,0) };
            var title = Caption("GENSHIN TRACKER",23,Gold); title.BackColor = Night;
            var subtitle = Caption("KAMERA FR  /  Votre aventure, une vue d’ensemble.",10,Muted); subtitle.BackColor=Night; subtitle.Top=54;
            title.Dock = DockStyle.None; title.SetBounds(0,6,600,42); subtitle.Dock=DockStyle.None; subtitle.SetBounds(2,52,650,28);
            var connect = ActionButton("Connexion au site"); connect.Anchor=AnchorStyles.Top|AnchorStyles.Right;connect.Location=new Point(870,16);
            header.Controls.AddRange(new Control[]{title,subtitle,connect}); header.Resize+=(s,e)=>connect.Left=header.ClientSize.Width-connect.Width;
            root.Controls.Add(header,0,1);
            var body = new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=2,RowCount=1,BackColor=Night};
            body.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,280));body.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));root.Controls.Add(body,0,2);
            var settings = Stack(); body.Controls.Add(settings,0,0);
            foreach(var label in new[]{Caption("01  /  COLLECTE",9,Gold),Caption("Préparer le scan",19),Caption("Choisissez les données à relever.",9,Muted)}) {label.Width=220;settings.Controls.Add(label);}
            foreach(var check in new[]{Characters_CheckBox,Weapons_CheckBox,Artifacts_Checkbox,CharDevItems_CheckBox,Materials_CheckBox})
            {check.AutoSize=false;check.Width=220;check.Height=36;check.Margin=new Padding(0,2,0,2);settings.Controls.Add(check);}
            var delayTitle=Caption("Vitesse de navigation",10,Muted);delayTitle.Width=220;delayTitle.Margin=new Padding(0,18,0,0);settings.Controls.Add(delayTitle);
            ScannerDelay_TrackBar.Width=220;ScannerDelay_TrackBar.Height=38;settings.Controls.Add(ScannerDelay_TrackBar);
            var delayHelp=Caption("Rapide           Modéré           Lent",8,Muted);delayHelp.Width=220;settings.Controls.Add(delayHelp);
            var launch=StartScan_Button;launch.Width=220;launch.Height=48;launch.FlatStyle=FlatStyle.Flat;launch.BackColor=Gold;launch.ForeColor=Night;launch.Font=new Font("Segoe UI",11,FontStyle.Bold);launch.Margin=new Padding(0,18,0,6);settings.Controls.Add(launch);
            var stop=Caption("ENTRÉE pour arrêter le scan",9,Muted);stop.Width=220;settings.Controls.Add(stop);
            var options=Caption("Options détaillées dans les onglets.",8,Muted);options.Width=220;settings.Controls.Add(options);
            var content=new TableLayoutPanel{Dock=DockStyle.Fill,RowCount=2,ColumnCount=1,BackColor=Night};content.RowStyles.Add(new RowStyle(SizeType.Absolute,100));content.RowStyles.Add(new RowStyle(SizeType.Percent,100));body.Controls.Add(content,1,0);
            var stats = new TableLayoutPanel {Dock=DockStyle.Fill,ColumnCount=3,BackColor=Night,Margin=new Padding(0,0,0,16)};
            foreach(var item in new[]{new{Title="PERSONNAGES",Value=CharactersScanned_Label,Max=(Label)null},new{Title="ARMES",Value=WeaponsScannedCount_Label,Max=WeaponsMax_Labell},new{Title="ARTÉFACTS",Value=ArtifactsScanned_Label,Max=ArtifactsMax_Label}})
            {
                stats.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,33.333f));var card=new Panel{Dock=DockStyle.Fill,BackColor=Surface,Padding=new Padding(18,12,18,8),Margin=new Padding(0,0,12,0)};
                var label=Caption(item.Title,8,Muted);label.Height=24;item.Value.Dock=DockStyle.Fill;item.Value.AutoSize=false;item.Value.Font=new Font("Segoe UI",25);item.Value.ForeColor=Gold;item.Value.BackColor=Surface;
                card.Controls.Add(item.Value);if(item.Max!=null){item.Max.Dock=DockStyle.Right;item.Max.AutoSize=false;item.Max.Width=50;item.Max.ForeColor=Muted;item.Max.BackColor=Surface;item.Max.TextAlign=ContentAlignment.BottomRight;card.Controls.Add(item.Max);}card.Controls.Add(label);stats.Controls.Add(card);
            }
            content.Controls.Add(stats,0,0);
            var tabs=new TabControl{Dock=DockStyle.Fill,Font=new Font("Segoe UI",10),Padding=new Point(18,10),DrawMode=TabDrawMode.OwnerDrawFixed,SizeMode=TabSizeMode.Fixed,ItemSize=new Size(155,42)};
            tabs.DrawItem+=(sender,e)=>{bool selected=e.Index==tabs.SelectedIndex;using(var brush=new SolidBrush(selected?Raised:Surface))e.Graphics.FillRectangle(brush,e.Bounds);TextRenderer.DrawText(e.Graphics,tabs.TabPages[e.Index].Text,tabs.Font,e.Bounds,selected?Gold:Muted,TextFormatFlags.HorizontalCenter|TextFormatFlags.VerticalCenter);if(selected)using(var pen=new Pen(Gold,2))e.Graphics.DrawLine(pen,e.Bounds.Left+12,e.Bounds.Bottom-2,e.Bounds.Right-12,e.Bounds.Bottom-2);if((e.State&DrawItemState.Focus)!=0)e.DrawFocusRectangle();};
            var live=new TabPage("Lecture en direct"){BackColor=Surface,Padding=new Padding(18)};
            var errors=new TabPage("Journal et erreurs"){BackColor=Surface,Padding=new Padding(18)};
            var optionsPage=new TabPage("Options du scan"){BackColor=Surface,Padding=new Padding(18)};
            var connection=new TabPage("Connexion"){BackColor=Surface,Padding=new Padding(22)};
            tabs.TabPages.AddRange(new[]{live,errors,optionsPage,connection});content.Controls.Add(tabs,0,1);connect.Click+=(s,e)=>tabs.SelectedTab=connection;
            var liveGrid=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=2,RowCount=3,BackColor=Surface};liveGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,45));liveGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,55));
            liveGrid.RowStyles.Add(new RowStyle(SizeType.Absolute,34));liveGrid.RowStyles.Add(new RowStyle(SizeType.Percent,52));liveGrid.RowStyles.Add(new RowStyle(SizeType.Percent,48));
            liveGrid.Controls.Add(Caption("Équipement en cours",10,Muted),0,0);liveGrid.Controls.Add(Caption("Personnage et aptitudes",10,Muted),1,0);
            GearPictureBox.Dock=DockStyle.Fill;GearPictureBox.SizeMode=PictureBoxSizeMode.Zoom;GearPictureBox.BackColor=Night;GearPictureBox.Margin=new Padding(0,0,16,12);liveGrid.Controls.Add(GearPictureBox,0,1);
            var samples=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=3,RowCount=3};for(int i=0;i<3;i++)samples.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,33.333f));
            foreach(var pair in new[]{new{Box=CharacterName_PictureBox,Row=0},new{Box=CharacterLevel_PictureBox,Row=1}}){pair.Box.Dock=DockStyle.Fill;pair.Box.SizeMode=PictureBoxSizeMode.Zoom;samples.Controls.Add(pair.Box,0,pair.Row);samples.SetColumnSpan(pair.Box,3);}
            int column=0;foreach(var picture in new[]{CharacterTalent1_PictureBox,CharacterTalent2_PictureBox,CharacterTalent3_PictureBox}){picture.Dock=DockStyle.Fill;picture.SizeMode=PictureBoxSizeMode.Zoom;samples.Controls.Add(picture,column++,2);}liveGrid.Controls.Add(samples,1,1);
            foreach(var text in new[]{ArtifactOutput_TextBox,CharacterOutput_TextBox}){text.Dock=DockStyle.Fill;text.Multiline=true;text.ScrollBars=ScrollBars.Vertical;text.Font=new Font("Consolas",9);text.ReadOnly=true;text.Margin=new Padding(0,0,12,0);}
            liveGrid.Controls.Add(ArtifactOutput_TextBox,0,2);liveGrid.Controls.Add(CharacterOutput_TextBox,1,2);live.Controls.Add(liveGrid);
            ErrorLog_TextBox.Dock=DockStyle.Fill;ErrorLog_TextBox.Multiline=true;ErrorLog_TextBox.ScrollBars=ScrollBars.Vertical;ErrorLog_TextBox.Font=new Font("Consolas",9);ErrorLog_TextBox.ReadOnly=true;
            var errorTitle=Caption("Les lectures incertaines restent visibles ici et dans le rapport exporté.",10,Muted);errors.Controls.Add(ErrorLog_TextBox);errors.Controls.Add(errorTitle);
            var optionsStack=Stack(0);optionsStack.Margin=new Padding(0);optionsPage.Controls.Add(optionsStack);
            AddSetting(optionsStack,"Rareté minimale des armes",WeaponRarityControl);AddSetting(optionsStack,"Rareté minimale des artéfacts",ArtifactRarityControl);
            AddSetting(optionsStack,"Niveau minimal des armes",MinimumWeaponLevelControl);AddSetting(optionsStack,"Niveau minimal des artéfacts",numericUpDown1);
            AddSetting(optionsStack,"Nom du Voyageur",travelerNameTextBox);AddSetting(optionsStack,"Nom personnalisé du Nomade",wandererNameTextBox);
            foreach(var check in new[]{EquipWeaponsCheckBox,EquipArtifactsCheckBox,LogScreenshotsCheckBox}){check.AutoSize=true;check.Margin=new Padding(0,12,0,0);optionsStack.Controls.Add(check);}
            AddSetting(optionsStack,"Dossier des exports",OutputPath_TextBox);FileSelectButton.Width=130;FileSelectButton.Height=36;optionsStack.Controls.Add(FileSelectButton);
            var exportButton=ActionButton("Ouvrir les exports");exportButton.Click+=ExportFolderMenuItem_Click;optionsStack.Controls.Add(exportButton);
            ManualExportButton.Width=200;ManualExportButton.Height=44;ManualExportButton.FlatStyle=FlatStyle.Flat;ManualExportButton.Text="Exporter vers Optimizer";optionsStack.Controls.Add(ManualExportButton);
            Navigation_Image.Width=160;Navigation_Image.Height=70;Navigation_Image.SizeMode=PictureBoxSizeMode.Zoom;optionsStack.Controls.Add(Navigation_Image);
            var info=Caption("Le jeu doit rester en français, en 16:9 ou 16:10, HDR désactivé.",9,Muted);info.Width=620;info.Height=45;optionsStack.Controls.Add(info);
            var connectionStack=Stack(0);connectionStack.Margin=new Padding(0);connection.Controls.Add(connectionStack);
            foreach(var label in new[]{Caption("02  /  SYNCHRONISATION",9,Gold),Caption("Du jeu à votre carnet",22),Caption("Créez un code temporaire dans Synchronisation sur le site.",10,Muted)}){label.Width=620;connectionStack.Controls.Add(label);}
            siteAddress=new TextBox{Text=ClientSync.SiteUrl,Width=560,BackColor=Night,ForeColor=Ink};pairingCode=new TextBox{Width=560,BackColor=Night,ForeColor=Gold};
            AddSetting(connectionStack,"Adresse HTTPS du site",siteAddress);AddSetting(connectionStack,"Code d’association (valable 10 minutes)",pairingCode);
            var pairButton=ActionButton("Associer mon compte",true);pairButton.Width=220;pairButton.Click+=async(s,e)=>{if(running){syncStatusLabel.Text="Attendez la fin du scan avant de changer de compte.";return;}pairButton.Enabled=false;try{await ClientSync.Pair(siteAddress.Text,pairingCode.Text);pairingCode.Clear();}catch(Exception ex){syncStatusLabel.Text=ex.Message;syncStatusLabel.ForeColor=Color.Salmon;}finally{pairButton.Enabled=true;}};connectionStack.Controls.Add(pairButton);
            var retry=ActionButton("Réessayer l’envoi");retry.Width=220;retry.Click+=async(s,e)=>{retry.Enabled=false;try{await ClientSync.SendPending();}finally{retry.Enabled=true;}};connectionStack.Controls.Add(retry);
            syncStatusLabel=Caption(ClientSync.AccountName==null?"Aucun compte associé. Les exports restent enregistrés sur ce PC.":"Compte associé : "+ClientSync.AccountName,10,Muted);syncStatusLabel.Width=620;syncStatusLabel.Height=90;syncStatusLabel.Margin=new Padding(0,20,0,12);connectionStack.Controls.Add(syncStatusLabel);
            var privacy=Caption("La clé d’accès est protégée par votre session Windows. Les scans hors ligne restent en attente. Vous pouvez dissocier ce PC depuis le site.",9,Muted);privacy.Width=620;privacy.Height=80;connectionStack.Controls.Add(privacy);
            ClientSync.StatusChanged=(text,ok)=>{if(!IsDisposed&&IsHandleCreated)BeginInvoke((MethodInvoker)(()=>{syncStatusLabel.Text=text;syncStatusLabel.ForeColor=ok?Mint:Color.Salmon;}));};
            var footer=new Panel{Dock=DockStyle.Fill,BackColor=Night,Padding=new Padding(0,15,0,0)};ProgramStatus_Label.AutoSize=false;ProgramStatus_Label.Dock=DockStyle.Top;ProgramStatus_Label.Height=30;ProgramStatus_Label.BackColor=Night;ProgramStatus_Label.Font=new Font("Segoe UI",11);footer.Controls.Add(ProgramStatus_Label);root.Controls.Add(footer,0,3);
            Controls.Add(root);ResumeLayout(true);
        }
        private static void AddSetting(FlowLayoutPanel panel,string name,Control control)
        {
            var label=Caption(name,9,Muted);label.Width=560;label.Margin=new Padding(0,14,0,2);panel.Controls.Add(label);
            control.Margin=new Padding(0,0,0,3);control.MinimumSize=new Size(0,28);control.Width=control is NumericUpDown?100:560;panel.Controls.Add(control);
        }
    }
}
