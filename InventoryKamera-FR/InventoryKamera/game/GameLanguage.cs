using System;

namespace InventoryKamera
{
    /// <summary>
    /// The language the game is set to. The OCR model, the text rules and the saved scan report must all follow it:
    /// English uses the shipped tessdata_fast English model and the original English rules; French uses the French rules.
    /// </summary>
    internal static class GameLanguage
    {
        public const string English = "en";
        public const string French = "fr";

        public static string Current => string.Equals(Properties.Settings.Default.GameLanguage, English, StringComparison.OrdinalIgnoreCase) ? English : French;

        public static bool IsFrench => Current == French;

        public static string OcrModel => IsFrench ? "fra+eng" : "eng";
    }
}
