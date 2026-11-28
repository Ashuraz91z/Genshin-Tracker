using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using WindowsInput.Native;

namespace InventoryKamera
{
    /// <summary>
    /// Quest log (J): it opens on the tab that mixes every quest type, which is skipped. E goes to each quest-type tab
    /// (4 according to Lucas, 28/11/2026); in each one the list is scrolled back to the top, then read page by page while scrolling down.
    /// Only raw OCR lines are sent, grouped by tab; the site turns them into quests (web/lib/quests.mjs), so the parsing is tested there.
    /// Regions are in 1280×720 reference coordinates (calibrated on a 1920×1080 French screenshot, 28/11/2026).
    ///
    /// Debug (28/11/2026): every step goes to the Kamera journal and to logging/quests/etapes.txt; every page read is kept in
    /// logging/quests/ as the raw capture (_brut.png), the image given to OCR (_ocr.png) and the text read (.txt).
    /// The folder is archived at the next scan and added to the "Signaler un bug" report.
    /// </summary>
    internal static class QuestScraper
    {
        private static readonly NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();
        public static VirtualKeyCode questKey = VirtualKeyCode.VK_J, nextTabKey = VirtualKeyCode.VK_E;
        internal const string Folder = "./logging/quests";

        /// <summary>One entry per tab, each a list of pages of OCR lines.</summary>
        internal static List<List<string[]>> Tabs { get; } = new List<List<string[]>>();
        internal static void Reset() => Tabs.Clear();

        // ponytail: fixed scroll steps and caps, calibrate if pages are skipped (too far), a tab is longer than 30 pages,
        // or the game adds a quest-type tab (MaxTabs).
        private const int ScrollTicks = 5, TopTicks = 60, MaxPages = 30, MaxTabs = 4;

        private static readonly Stopwatch Clock = new Stopwatch();
        private static double lastInk; // share of text pixels in the last capture

        /// <summary>One debug line: Kamera journal (sent with the scan report), log file and etapes.txt.</summary>
        private static void Step(string message, bool journal = true)
        {
            string line = "Quêtes [" + (Clock.ElapsedMilliseconds / 1000.0).ToString("0.0") + " s] " + message;
            Logger.Info(line);
            if (journal) UserInterface.Trace(line);
            try { Directory.CreateDirectory(Folder); File.AppendAllText(Path.Combine(Folder, "etapes.txt"), DateTime.Now.ToString("HH:mm:ss.fff") + " " + line + Environment.NewLine); } catch (Exception) { }
        }

        private static void Key(VirtualKeyCode key, string why)
        {
            Step("touche " + key + " (" + why + ")");
            Navigation.KeyPress(key);
        }

        /// <summary>Starts and ends with the Paimon menu open.</summary>
        internal static void Scan()
        {
            Reset();
            Clock.Restart();
            try
            {
                int w = Navigation.GetWidth(), h = Navigation.GetHeight();
                var list = ProfileScraper.Region(97, 97, 543, 660);
                Step("début · fenêtre du jeu " + w + "×" + h + " (format " + Navigation.GetAspectRatio().Width + ":" + Navigation.GetAspectRatio().Height + ")"
                    + " · zone lue x=" + list.X + " y=" + list.Y + " " + list.Width + "×" + list.Height + " · défilement " + ScrollTicks + " crans, " + MaxTabs + " onglets max");
                if (Navigation.GetAspectRatio() != new Size(16, 9)) Step("ATTENTION : zones calibrées en 16:9 seulement, la lecture risque d'être décalée.");

                Key(Navigation.escapeKey, "fermer le menu Paimon");
                Navigation.SystemWait(Navigation.Speed.UI);
                Key(questKey, "ouvrir le journal de quêtes");
                Navigation.Wait(2500);

                var seen = new List<string>(); // first page of each tab read: the same one again means E went back round
                int empty = 0;
                for (int tab = 0; tab < MaxTabs; tab++)
                {
                    Key(nextTabKey, tab == 0 ? "quitter l'onglet « tout », non lu" : "onglet suivant");
                    Navigation.Wait(1200);
                    var pages = ReadTab(list, tab);
                    string first = string.Join("\n", pages.FirstOrDefault() ?? new string[0]);
                    if (first.Length == 0)
                    {
                        Step("onglet " + (tab + 1) + " : aucun texte lu (journal fermé, onglet vide ou zone décalée ? voir " + Folder + "/onglet" + (tab + 1) + "_page1_brut.png)");
                        if (++empty >= 2) { Step("deux onglets vides de suite : arrêt."); break; }
                        continue;
                    }
                    int again = seen.IndexOf(first);
                    if (again >= 0) { Step("onglet " + (tab + 1) + " identique à l'onglet " + (again + 1) + " déjà lu : E est revenu au début, arrêt."); break; }
                    seen.Add(first);
                    empty = 0;
                    Tabs.Add(pages);
                    Step("onglet " + (tab + 1) + " gardé : " + pages.Count + " page(s), " + pages.Sum(p => p.Length) + " ligne(s).");
                }
                Step("fin : " + Tabs.Count + " onglet(s), " + Tabs.Sum(t => t.Count) + " page(s), " + Tabs.Sum(t => t.Sum(p => p.Length)) + " ligne(s) envoyées au site. Images et textes : " + Path.GetFullPath(Folder));
            }
            catch (InvalidOperationException ex) { Step("ARRÊT : " + ex.Message); throw; } // Genshin lost focus: stop the scan as elsewhere.
            catch (Exception ex) { Logger.Error(ex, "Quest log failed"); Step("ERREUR : " + ex.GetType().Name + " : " + ex.Message); UserInterface.AddError("Quêtes : lecture impossible : " + ex.Message); }
            finally { Step("retour au menu Paimon (Échap ×2)"); Navigation.MainMenuScreen(); Clock.Stop(); }
        }

        /// <summary>Back to the top of the list (it is not always there), then down page by page until two reads match.</summary>
        private static List<string[]> ReadTab(Rectangle list, int tab)
        {
            var pages = new List<string[]>();
            var cursor = At(320, 400);
            Step("onglet " + (tab + 1) + " : souris en " + cursor.X + "," + cursor.Y + ", remontée en haut (" + TopTicks + " crans)");
            Navigation.SetCursor(cursor);
            Navigation.Scroll(Navigation.Direction.UP, TopTicks, 10);
            Navigation.Wait(700);
            for (int i = 0; i < MaxPages; i++)
            {
                var lines = ReadPage(list, tab, i);
                if (pages.Count > 0 && lines.SequenceEqual(pages.Last())) { Step("onglet " + (tab + 1) + " page " + (i + 1) + " identique à la précédente : fin de la liste."); break; }
                pages.Add(lines);
                if (i == MaxPages - 1) { Step("onglet " + (tab + 1) + " : limite de " + MaxPages + " pages atteinte, la suite n'est pas lue."); break; }
                Navigation.SetCursor(cursor);
                Navigation.Scroll(Navigation.Direction.DOWN, ScrollTicks, 30);
                Navigation.Wait(700);
            }
            return pages;
        }

        private static string[] ReadPage(Rectangle region, int tab, int page)
        {
            string name = Path.Combine(Folder, "onglet" + (tab + 1) + "_page" + (page + 1));
            var timer = Stopwatch.StartNew();
            string text;
            using (var image = Prepare(region, name))
                text = GenshinProcesor.AnalyzeText(image, Tesseract.PageSegMode.SingleColumn, raw: true) ?? "";
            var lines = text.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 1).Take(200).Select(l => l.Length > 200 ? l.Substring(0, 200) : l).ToArray();
            try { File.WriteAllText(name + ".txt", "Texte brut de Tesseract :" + Environment.NewLine + text + Environment.NewLine + "Lignes gardées (" + lines.Length + ") :" + Environment.NewLine + string.Join(Environment.NewLine, lines)); } catch (Exception) { }
            Step("onglet " + (tab + 1) + " page " + (page + 1) + " : " + lines.Length + " ligne(s) en " + timer.ElapsedMilliseconds + " ms, texte sur " + lastInk.ToString("0.0") + " % de l'image"
                + (lines.Length > 0 ? " · « " + string.Join(" | ", lines.Take(4)) + (lines.Length > 4 ? " | …" : "") + " »" : " · RIEN LU"));
            Logger.Debug("Quest page {0}/{1} lines: {2}", tab + 1, page + 1, string.Join(" || ", lines));
            return lines;
        }

        /// <summary>Red channel only: white titles and the red "Terminez d'abord…" both stand out from the blue-grey cards.
        /// Thresholded at 110 and enlarged ×2 (checked with Tesseract fra on the reference screenshot).</summary>
        private static Bitmap Prepare(Rectangle region, string name)
        {
            using (var capture = Navigation.CaptureRegion(region))
            {
                try { Directory.CreateDirectory(Folder); capture.Save(name + "_brut.png"); } catch (Exception ex) { Logger.Warn(ex, "Quest capture not saved"); }
                UserInterface.SetNavigation_Image(capture);
                using (var mask = new Bitmap(capture.Width, capture.Height))
                {
                    int dark = 0;
                    for (int x = 0; x < capture.Width; x++)
                        for (int y = 0; y < capture.Height; y++)
                        {
                            bool ink = capture.GetPixel(x, y).R > 110;
                            if (ink) dark++;
                            mask.SetPixel(x, y, ink ? Color.Black : Color.White);
                        }
                    // Text covers a few % of the list (~6 % on the reference screenshot); ~0 % = nothing on screen, a large share = wrong screen or a bright background.
                    lastInk = 100.0 * dark / (capture.Width * capture.Height);
                    var large = new Bitmap(mask.Width * 2, mask.Height * 2);
                    using (var g = Graphics.FromImage(large)) { g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.DrawImage(mask, 0, 0, large.Width, large.Height); }
                    try { large.Save(name + "_ocr.png"); } catch (Exception) { }
                    return large;
                }
            }
        }

        private static Point At(int x, int y) => new Point((int)(x / 1280.0 * Navigation.GetWidth()), (int)(y / 720.0 * Navigation.GetHeight()));
    }
}
