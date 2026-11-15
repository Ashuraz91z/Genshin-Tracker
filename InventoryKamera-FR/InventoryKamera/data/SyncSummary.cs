using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace InventoryKamera
{
    public static class SyncSummary
    {
        private static readonly Dictionary<string,string> Categories = new Dictionary<string,string> {
            ["characters"]="Personnages", ["weapons"]="Armes", ["artifacts"]="Artéfacts", ["materials"]="Matériaux" };
        private static readonly Dictionary<string,string> Outcomes = new Dictionary<string,string> {
            ["merged"]="données mises à jour", ["replaced"]="inventaire remplacé, compteur concordant", ["first_partial"]="premier relevé partiel",
            ["preserved_previous"]="ancien inventaire conservé : scan incomplet", ["older_scan"]="relevé ancien ignoré",
            ["empty_scan"]="aucune donnée lisible, données précédentes conservées", ["manual_replaced"]="remplacement manuel demandé, données non vérifiées" };
        public static IEnumerable<string> Describe(JObject receipt)
        {
            foreach (var item in (receipt["applied"] as JObject ?? new JObject()).Properties())
            {
                string outcome=(string)item.Value;
                yield return (Categories.ContainsKey(item.Name)?Categories[item.Name]:item.Name) + " : " + receipt["counts"]?[item.Name]
                    + " reçus — " + (Outcomes.ContainsKey(outcome)?Outcomes[outcome]:outcome);
            }
        }
    }
}
