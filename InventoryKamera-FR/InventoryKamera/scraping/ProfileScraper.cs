using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text.RegularExpressions;
using WindowsInput.Native;

namespace InventoryKamera
{
    /// <summary>
    /// Account profile and currencies, read before the inventory scan:
    /// nickname and UID in the Paimon menu, primogems, fates, stardust and starglitter in the wish screen, Mora in the character screen.
    /// Regions are in 1280×720 reference coordinates (calibrated on a 1920×1080 French client, 26/11/2026).
    /// </summary>
    internal static class ProfileScraper
    {
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        public static VirtualKeyCode wishKey = VirtualKeyCode.F3;

        internal static string Nickname { get; private set; }
        internal static string Uid { get; private set; }

        internal static void Reset() { Nickname = null; Uid = null; }

        /// <summary>Starts and ends with the Paimon menu open.</summary>
        internal static void Scan(Inventory inventory)
        {
            Reset();
            Attempt("pseudo et UID", () =>
            {
                Nickname = ReadText(Region(200, 22, 470, 62));
                if (Nickname != null) Nickname = Regex.Replace(Nickname, @"[^\p{L}\p{N}_ .-]", "").Trim();
                if (string.IsNullOrEmpty(Nickname)) Nickname = null;
                var uid = Regex.Match(ReadText(Region(70, 124, 205, 158)) ?? "", @"\d{9,10}");
                if (!uid.Success) uid = Regex.Match(ReadText(Region(70, 124, 205, 158), numbersOnly: true) ?? "", @"\d{9,10}");
                Uid = uid.Success ? uid.Value : null;
            });

            Attempt("écran des vœux", () =>
            {
                Navigation.KeyPress(Navigation.escapeKey);
                Navigation.SystemWait(Navigation.Speed.UI);
                Navigation.KeyPress(wishKey);
                Navigation.Wait(3000);
                try
                {
                    var top = Numbers(Region(990, 14, 1200, 50));
                    if (top.Count > 0) Add(inventory, "Primogem", top[0]);
                    string fate = FateKind(Region(1110, 20, 1160, 44));
                    if (top.Count > 1 && fate != null) Add(inventory, fate, top[1]);
                    var bottom = Numbers(Region(35, 628, 300, 666, bottomAnchored: true));
                    if (bottom.Count > 0) Add(inventory, "MasterlessStarglitter", bottom[0]);
                    if (bottom.Count > 1) Add(inventory, "MasterlessStardust", bottom[1]);
                }
                finally { Navigation.MainMenuScreen(); }
            });

            Attempt("moras", () =>
            {
                Navigation.CharacterScreen();
                try
                {
                    var mora = Numbers(Region(1070, 14, 1205, 50));
                    if (mora.Count > 0) Add(inventory, "Mora", mora.Last());
                }
                finally { Navigation.MainMenuScreen(); }
            });

            string Count(string key) { var m = inventory.Materials.FirstOrDefault(x => x.name == key); return m.name == null ? "?" : m.count.ToString(); }
            UserInterface.Trace("Profil : " + (Nickname ?? "pseudo illisible") + " · UID " + (Uid ?? "illisible") + " · " + Count("Primogem") + " primogemmes · "
                + Count("IntertwinedFate") + " destins entrelacés · " + Count("AcquaintFate") + " destins liés · " + Count("MasterlessStardust") + " astéries libres · "
                + Count("MasterlessStarglitter") + " astérions libres · " + Count("Mora") + " moras.");
        }

        private static void Attempt(string step, Action action)
        {
            try { action(); }
            catch (InvalidOperationException) { throw; } // Genshin lost focus: stop the scan as elsewhere.
            catch (Exception ex) { Logger.Error(ex, "Profile step failed: " + step); UserInterface.AddError("Profil : lecture impossible (" + step + ") : " + ex.Message); }
        }

        private static void Add(Inventory inventory, string key, int count)
        {
            var material = new Material(key, count);
            inventory.Materials.Remove(material);
            inventory.Materials.Add(material);
        }

        private static Rectangle Region(int left, int top, int right, int bottom, bool bottomAnchored = false)
        {
            double height = 720.0;
            if (Navigation.GetAspectRatio() == new Size(8, 5)) { height = 800.0; if (bottomAnchored) { top += 80; bottom += 80; } }
            int w = Navigation.GetWidth(), h = Navigation.GetHeight();
            return Rectangle.FromLTRB((int)(left / 1280.0 * w), (int)(top / height * h), (int)(right / 1280.0 * w), (int)(bottom / height * h));
        }

        private static Bitmap Prepare(Rectangle region)
        {
            var bitmap = Navigation.CaptureRegion(region);
            if (Properties.Settings.Default.LogScreenshots) try { bitmap.Save($"./logging/profile_{region.X}_{region.Y}.png"); } catch (Exception) { }
            UserInterface.SetNavigation_Image(bitmap);
            GenshinProcesor.SetGamma(0.2, 0.2, 0.2, ref bitmap);
            GenshinProcesor.SetInvert(ref bitmap);
            var gray = GenshinProcesor.ConvertToGrayscale(bitmap);
            bitmap.Dispose();
            return gray;
        }

        private static string ReadText(Rectangle region, bool numbersOnly = false)
        {
            using (var image = Prepare(region))
                return GenshinProcesor.AnalyzeText(image, Tesseract.PageSegMode.SingleLine, numbersOnly)?.Trim();
        }

        /// <summary>Whole numbers read left to right; icons and the "+" button are dropped.</summary>
        internal static List<int> Numbers(Rectangle region)
        {
            string text = ReadText(region) ?? "";
            Logger.Debug("Profile numbers {0}: {1}", region, text);
            return ParseNumbers(text);
        }

        internal static List<int> ParseNumbers(string text) =>
            Regex.Matches(text ?? "", @"\d+")
                .Cast<Match>().Select(m => Regex.Replace(m.Value, @"\D", ""))
                .Where(s => s.Length <= 9).Select(int.Parse).ToList();

        /// <summary>The wish screen shows the fate of the current banner: pink = Intertwined, blue = Acquaint.</summary>
        private static string FateKind(Rectangle region)
        {
            using (var bitmap = Navigation.CaptureRegion(region))
            {
                int pink = 0, blue = 0;
                for (int x = 0; x < bitmap.Width; x++)
                    for (int y = 0; y < bitmap.Height; y++)
                    {
                        var c = bitmap.GetPixel(x, y);
                        if (c.R > 170 && c.B > 140 && c.G < c.R - 40) pink++;
                        else if (c.B > 170 && c.R < c.B - 60 && c.G < c.B - 20) blue++;
                    }
                Logger.Debug("Fate colour: pink {0}, blue {1}", pink, blue);
                if (pink + blue < 10) { UserInterface.AddError("Profil : type de destin non reconnu sur l'écran des vœux."); return null; }
                return pink >= blue ? "IntertwinedFate" : "AcquaintFate";
            }
        }
    }
}
