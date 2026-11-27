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
        internal static int? AdventureRank { get; private set; }
        internal static int? WorldLevel { get; private set; }

        // Values read so far, shown live in the interface while the scan is running (key = material name).
        internal static readonly System.Collections.Concurrent.ConcurrentDictionary<string, int> Currencies = new System.Collections.Concurrent.ConcurrentDictionary<string, int>();

        internal static void Reset() { Nickname = null; Uid = null; AdventureRank = null; WorldLevel = null; Currencies.Clear(); }

        /// <summary>Starts and ends with the Paimon menu open.</summary>
        internal static void Scan(Inventory inventory)
        {
            Reset();
            Attempt("pseudo et UID", () =>
            {
                Nickname = ReadText(Region(200, 22, 470, 62), raw: true); // keep the exact case and accents
                if (Nickname != null) Nickname = Regex.Replace(Nickname, @"[^\p{L}\p{N}_ .-]", "").Trim();
                if (string.IsNullOrEmpty(Nickname)) Nickname = null;
                var uid = Regex.Match(ReadText(Region(70, 124, 205, 158)) ?? "", @"\d{9,10}");
                if (!uid.Success) uid = Regex.Match(ReadText(Region(70, 124, 205, 158), numbersOnly: true) ?? "", @"\d{9,10}");
                Uid = uid.Success ? uid.Value : null;
                // Right-hand numbers of "Niv. d'aventure" and "Niv. du monde", left of the (i) buttons.
                AdventureRank = Level(Region(415, 106, 472, 137), 1, 60);
                WorldLevel = Level(Region(415, 160, 472, 188), 0, 9);
            });

            Attempt("écran des vœux", () =>
            {
                Navigation.KeyPress(Navigation.escapeKey);
                Navigation.SystemWait(Navigation.Speed.UI);
                Navigation.KeyPress(wishKey);
                Navigation.Wait(3000);
                try
                {
                    // Top right, anchored to the close button: [primogem icon] number [+]  [fate icon] number.
                    // Coloured icons are blanked before OCR (they were read as digits), and each number is read on its own.
                    var primos = Numbers(Region(975, 14, 1072, 50));
                    if (primos.Count > 0) Add(inventory, "Primogem", primos.Last());
                    // The fate shown is the one of the open banner: every event banner uses Pierre de la fatalité
                    // (Intertwined, pink icon), the standard banner, last in the list, uses Pierre de la destinée (Acquaint, blue).
                    ReadFate(inventory);
                    var arrow = IsIntertwined() ? At(1227, 360, middle: true) : At(47, 360, middle: true);
                    for (int i = 0; i < 8 && !(inventory.Materials.Contains(new Material("IntertwinedFate", 0)) && inventory.Materials.Contains(new Material("AcquaintFate", 0))); i++)
                    {
                        Navigation.Click(arrow); // next banner towards the missing fate
                        Navigation.Wait(900);
                        ReadFate(inventory);
                    }
                    // Bottom left, after the first icon: Starglitter (Astérie libre) then Stardust (Astrion libre).
                    var bottom = Numbers(Region(66, 628, 300, 666, bottomAnchored: true));
                    if (bottom.Count > 0) Add(inventory, "MasterlessStarglitter", bottom[0]);
                    if (bottom.Count > 1) Add(inventory, "MasterlessStardust", bottom.Last());
                }
                finally { Navigation.MainMenuScreen(); }
            });

            Attempt("moras", () =>
            {
                Navigation.CharacterScreen();
                try
                {
                    // Mora is shown top right on the Constellation page only.
                    Navigation.SelectCharacterConstellation();
                    Navigation.Wait(800);
                    var mora = Numbers(Region(1098, 14, 1205, 50));
                    if (mora.Count > 0) Add(inventory, "Mora", mora.Last());
                }
                finally { Navigation.MainMenuScreen(); }
            });

            string Count(string key) { var m = inventory.Materials.FirstOrDefault(x => x.name == key); return m.name == null ? "?" : m.count.ToString(); }
            UserInterface.Trace("Profil : " + (Nickname ?? "pseudo illisible") + " · UID " + (Uid ?? "illisible") + " · rang d'aventure " + (AdventureRank?.ToString() ?? "?")
                + " · niveau du monde " + (WorldLevel?.ToString() ?? "?") + " · " + Count("Primogem") + " primogemmes · "
                + Count("IntertwinedFate") + " pierres de la fatalité · " + Count("AcquaintFate") + " pierres de la destinée · " + Count("MasterlessStarglitter") + " astéries libres · "
                + Count("MasterlessStardust") + " astrions libres · " + Count("Mora") + " moras.");
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
            Currencies[key] = count;
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
            BlankColours(bitmap);
            GenshinProcesor.SetGamma(0.2, 0.2, 0.2, ref bitmap);
            GenshinProcesor.SetInvert(ref bitmap);
            var gray = GenshinProcesor.ConvertToGrayscale(bitmap);
            bitmap.Dispose();
            return gray;
        }

        /// <summary>Game text is white; icons are coloured. Coloured pixels are darkened so OCR sees only the text.</summary>
        private static void BlankColours(Bitmap bitmap)
        {
            for (int x = 0; x < bitmap.Width; x++)
                for (int y = 0; y < bitmap.Height; y++)
                {
                    var c = bitmap.GetPixel(x, y);
                    if (Math.Max(c.R, Math.Max(c.G, c.B)) - Math.Min(c.R, Math.Min(c.G, c.B)) > 45) bitmap.SetPixel(x, y, Color.FromArgb(30, 30, 40));
                }
        }

        private static string ReadText(Rectangle region, bool numbersOnly = false, bool raw = false)
        {
            using (var image = Prepare(region))
                return GenshinProcesor.AnalyzeText(image, Tesseract.PageSegMode.SingleLine, numbersOnly, raw)?.Trim();
        }

        /// <summary>A small number in range; retried with a digits-only whitelist, which reads lone digits better.</summary>
        private static int? Level(Rectangle region, int min, int max)
        {
            var found = Numbers(region).Where(n => n >= min && n <= max).ToList();
            if (found.Count == 0) found = ParseNumbers(ReadText(region, numbersOnly: true)).Where(n => n >= min && n <= max).ToList();
            return found.Count > 0 ? found.Last() : (int?)null;
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

        private static Point At(int x, int y, bool middle = false)
        {
            double height = middle || Navigation.GetAspectRatio() != new Size(8, 5) ? 720.0 : 800.0;
            return new Point((int)(x / 1280.0 * Navigation.GetWidth()), (int)(y / height * Navigation.GetHeight()));
        }

        private static bool IsIntertwined() => PinkShare(Region(1120, 18, 1150, 46)) >= 0.08;

        private static void ReadFate(Inventory inventory)
        {
            string key = IsIntertwined() ? "IntertwinedFate" : "AcquaintFate";
            if (inventory.Materials.Contains(new Material(key, 0))) return;
            var fates = Numbers(Region(1143, 14, 1208, 50));
            if (fates.Count > 0) Add(inventory, key, fates[0]);
        }

        /// <summary>Share of coloured pixels that are pink. The Intertwined icon is pink with a blue ring (~25 % pink on a
        /// 1920×1080 capture); the Acquaint icon is blue only.</summary>
        private static double PinkShare(Rectangle region)
        {
            using (var bitmap = Navigation.CaptureRegion(region))
            {
                int pink = 0, coloured = 0;
                for (int x = 0; x < bitmap.Width; x++)
                    for (int y = 0; y < bitmap.Height; y++)
                    {
                        var c = bitmap.GetPixel(x, y);
                        if (Math.Max(c.R, Math.Max(c.G, c.B)) - Math.Min(c.R, Math.Min(c.G, c.B)) < 50 || c.B < 120) continue;
                        coloured++;
                        if (c.R > c.G + 25) pink++;
                    }
                Logger.Debug("Fate icon: {0} pink of {1} coloured pixels", pink, coloured);
                return coloured < 10 ? 1.0 : pink / (double)coloured;
            }
        }
    }
}
