using System;
using InventoryKamera;

static void Check(string input, string expected)
{
    var actual = FrenchRecognition.ForScanner(input);
    if (actual != expected) throw new Exception($"{input}: expected [{expected}], received [{actual}]");
}
Check("Maîtrise élémentaire +23", "Elemental Mastery +23");
Check("Recharge d’énergie +6,5 %", "Energy Recharge +6,5 %");
Check("Taux CRIT +3,9 %", "CRIT Rate +3,9 %");
Check("Bonus de DGT Électro 46,6 %", "electro DMG Bonus 46,6 %");
Check("Équipé par : Nomade", "Equipped : Wanderer");
Check("Fleur de la vie", "Flower of Life");
Check("Rideau du Gladiateur", "Gladiator's Finale");
Check("Nostalgie du Gladiateur", "Gladiator's Nostalgia");
Check("Épée émoussée", "Dull Blade");
Check("Maitrise\nelementaire +23", "Elemental Mastery +23");
Check("Maîtriseélémentaire +23", "Elemental Mastery +23");
Check("PV +1 234", "HP +1 234");
Check("Niv. 10", "niv. 10");
Check("inconnu", "inconnu");
Check("", "");
Console.WriteLine("15 checks passed: French names, accents, wrapped text, decimal commas, boundaries and unknown text.");
foreach (var sample in new[] { ("3,9 %", 3.9m), ("46.6%", 46.6m), ("1 234", 1234m), ("10 %", 10m), ("+23", 23m) })
    if (!FrenchRecognition.TryReadNumber(sample.Item1, out var value) || value != sample.Item2) throw new Exception("Numeric parsing failed: " + sample.Item1);
foreach (string invalid in new[] { "?", "3,9,1", "-1", "", "12abc" })
    if (FrenchRecognition.TryReadNumber(invalid, out _)) throw new Exception("Accepted invalid number: " + invalid);
Console.WriteLine("10 checks passed: French and English decimal separators, thousands and malformed numbers.");
var aliases = Newtonsoft.Json.JsonConvert.DeserializeObject<System.Collections.Generic.Dictionary<string,string>>(
    System.IO.File.ReadAllText(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "inventorylists", "french-aliases.json")));
foreach (var pair in aliases)
    Check(pair.Key, pair.Value);
Console.WriteLine($"{aliases.Count} paired French names passed against their English identifiers.");
foreach (var sample in new[] { ("0/2100",0), ("123 / 2100",123), ("2 345 / 3 000",2345) })
    if (!FrenchRecognition.TryReadInventoryCount(sample.Item1, out var count) || count != sample.Item2) throw new Exception("Inventory count failed");
foreach (string invalid in new[] { "1232100", "123/100", "12/?", "12/0", "-1/100", "" })
    if (FrenchRecognition.TryReadInventoryCount(invalid, out _)) throw new Exception("Guessed inventory count: " + invalid);
Console.WriteLine("9 checks passed: inventory totals, changed capacity and unreadable counts.");
