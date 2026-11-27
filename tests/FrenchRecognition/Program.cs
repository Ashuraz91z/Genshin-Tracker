using System;
using System.Linq;
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

var failures=new System.Collections.Generic.List<string>();
string Map(string name)=>new System.Collections.Generic.Dictionary<string,string>{{"hp","hp"},{"atk","atk"},{"hp%","hp_"},{"def","def"},{"critrate%","critRate_"},{"energyrecharge%","enerRech_"},{"atk%","atk_"}}.TryGetValue(name,out var key)?key:null;
var rolls=FrenchRecognition.ReadArtifactSubstats("PV sans valeur\nhp+239\nTexte OCR sans nombre\ndef+23\ncritrate+3,5%(aactiver)\nenergyrecharge+5,2%",Map,failures.Add);
if(rolls.Count!=3||rolls[0].Key!="hp"||rolls[0].Value!=239||rolls[2].Key!="enerRech_"||rolls[2].Value!=5.2m||failures.Count!=0)throw new Exception("Non-stat lines or inactive previews corrupted artifact parsing.");
var broken=FrenchRecognition.ReadArtifactSubstats("atk+5,8%\ninconnu+12",Map,failures.Add);
if(broken.Count!=2||broken[0].Key!="atk_"||broken[1].Key!=""||broken[1].Value!=-1||failures.Count!=1)throw new Exception("Invalid active stats were silently accepted or dropped.");
failures.Clear();
if(FrenchRecognition.ReadArtifactSubstats("atk+i,1 %",Map,failures.Add)[0].Key!=""||failures.Count!=1)throw new Exception("Dropped-digit percent must stay an error.");
failures.Clear();
var ocr=FrenchRecognition.ReadArtifactSubstats("hp+i1,1 %\ndef+16(a\nhp+h9\natk+n,1 %\natk+hi6",Map,failures.Add);
if(ocr.Count!=4||ocr[0].Key!="hp_"||ocr[0].Value!=11.1m||ocr[1].Value!=19||ocr[2].Key!="atk_"||ocr[2].Value!=11.1m||ocr[3].Value!=16||failures.Count!=0)throw new Exception("OCR digit-1 confusions or truncated inactive marker not handled.");
failures.Clear();
var setStop=FrenchRecognition.ReadArtifactSubstats("hp+239\n2-piece: +18% ATK",Map,failures.Add);
if(setStop.Count!=1)throw new Exception("Set bonuses were parsed as substats.");
Console.WriteLine("Artifact OCR regressions: non-stat line gaps, inactive rolls, French decimals, truncated suffixes and set boundaries passed.");

var equipmentNames = new System.Collections.Generic.Dictionary<string,string> {
    {"sangonomiyakokomi","SangonomiyaKokomi"}, {"skirk","Skirk"}, {"raidenshogun","RaidenShogun"}, {"wanderer","Wanderer"}
};
string FindEquipmentOwner(string name) => equipmentNames.TryGetValue(name,out var key) ? key : null;
foreach (var sample in new[] {
    ("Équipé par Sangonomiya Kokomi", "SangonomiyaKokomi"),
    ("Équipé par Skirk", "Skirk"),
    ("Equipped: Skirk", "Skirk"),
    ("Équipé par : Sangonomiya Kokomi", "SangonomiyaKokomi"),
    ("  EQUIPE PAR\u00a0Sangonomiya\nKokomi  ", "SangonomiyaKokomi"),
    ("Equipped Sangonomiya Kokomi", "SangonomiyaKokomi"),
    ("Equipped: Sangonomiya Kokomi", "SangonomiyaKokomi"),
    ("Equipped : Raiden Shogun", "RaidenShogun"),
    ("Équipé par Shogun Raiden", "RaidenShogun"),
    ("Équipé par Nomade", "Wanderer"),
    ("Équipé : Nomade", "Wanderer")
}) {
    var owner=FrenchRecognition.ReadEquippedCharacter(sample.Item1,FindEquipmentOwner);
    if(owner!=sample.Item2)throw new Exception("Equipment owner failed: "+sample.Item1+" => "+owner);
    if(FrenchRecognition.ReadEquippedCharacter(FrenchRecognition.ForScanner(sample.Item1),FindEquipmentOwner)!=owner)
        throw new Exception("Pre-normalized OCR changed the equipment owner.");
}
foreach (var text in new[] {null,"","Non équipé","Non équipé par Sangonomiya Kokomi","Sangonomiya Kokomi","Équipé par", "Equipped:","Équipé par inconnu","Équipé par Sangonomiya Kokomi 123"})
    if(FrenchRecognition.ReadEquippedCharacter(text,FindEquipmentOwner)!=null)throw new Exception("Guessed owner: "+text);
Console.WriteLine("Equipment regressions passed: real Kokomi label without colon, French/English variants, wrapped OCR, aliases and absent/unknown owners.");
