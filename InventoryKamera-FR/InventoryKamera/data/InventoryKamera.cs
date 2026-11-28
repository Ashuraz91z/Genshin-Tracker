using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace InventoryKamera
{
    public class InventoryKamera
	{

		private static NLog.Logger Logger = NLog.LogManager.GetCurrentClassLogger();

		[JsonProperty]
		public List<Character> Characters;

		[JsonProperty]
		public Inventory Inventory;

		private List<Artifact> equippedArtifacts;
		private List<Weapon> equippedWeapons;
		public static Queue<OCRImageCollection> workerQueue;
		private List<Thread> ImageProcessors;

		private WeaponScraper weaponScraper;
		private ArtifactScraper artifactScraper;
		private MaterialScraper materialScraper;

		private volatile bool b_threadCancel;
		private readonly int NumWorkers;

		public bool HasData
        {
			get { return Characters.Count > 0 || Inventory.Size > 0; }
        }

		public InventoryKamera()
		{
			Characters = new List<Character>();
			Inventory = new Inventory();
			equippedArtifacts = new List<Artifact>();
			equippedWeapons = new List<Weapon>();
			ImageProcessors = new List<Thread>();
			workerQueue = new Queue<OCRImageCollection>();

			weaponScraper = new WeaponScraper();
			artifactScraper = new ArtifactScraper();
			materialScraper = new MaterialScraper();

			b_threadCancel = false;

            switch (Properties.Settings.Default.ScannerDelay)
            {
				case 0:
					NumWorkers = 3;
					break;
				default:
					NumWorkers = 2;
					break;
            }
			Logger.Info("Kamera initialized");
		}

        public void ResetLogging()
        {
            // Captures of earlier scans pile up fast (hundreds of MB per full scan): keep only the most recent archive.
            try
            {
                string archives = "./logging/archives";
                if (Directory.Exists(archives))
                    foreach (var old in new DirectoryInfo(archives).GetDirectories("captures_*").OrderByDescending(d => d.Name).Skip(1))
                        old.Delete(true);
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
            string archive = Path.Combine("./logging/archives", "captures_" + DateTime.Now.ToString("yyyyMMdd_HHmmss_fff"));
            foreach (string category in new[] { "weapons", "artifacts", "characters", "materials", "quests" })
            {
                string path = Path.Combine("./logging", category);
                if (Directory.Exists(path))
                {
                    Directory.CreateDirectory(archive);
                    Directory.Move(path, Path.Combine(archive, category));
                }
                Directory.CreateDirectory(path);
            }
        }

		public void StopImageProcessorWorkers()
		{
			b_threadCancel = true;
			AwaitProcessors();
			workerQueue = new Queue<OCRImageCollection>();
		}

		public void GatherData()
		{

			ResetLogging();

			GenshinProcesor.ReloadData();

			// Initize Image Processors
			for (int i = 0; i < NumWorkers; i++)
			{
				Thread processor = new Thread(ImageProcessorWorker){ IsBackground = true };
				processor.Start();
				ImageProcessors.Add(processor);
			}
			Logger.Debug("Added {ImageProcessors.Count} workers", ImageProcessors.Count);

			GenshinProcesor.RestartEngines();


			// Profile and currencies (Paimon menu, wish screen, character screen)
			ProfileScraper.Reset();
			QuestScraper.Reset();
			if (Properties.Settings.Default.ScanProfile)
			{
				UserInterface.SetProgramStatus("Lecture du profil et des monnaies…");
				ProfileScraper.Scan(Inventory);
			}
			if (Properties.Settings.Default.ScanQuests)
			{
				UserInterface.SetProgramStatus("Lecture du journal de quêtes…");
				QuestScraper.Scan();
			}

			// Assign Traveler's custom name; the Paimon-menu nickname is the Traveler's name when none is set.
			string travelerName = Properties.Settings.Default.TravelerName;
			if (string.IsNullOrWhiteSpace(travelerName) && ProfileScraper.Nickname != null) travelerName = ProfileScraper.Nickname;
			GenshinProcesor.AssignTravelerName(travelerName);

			// Assign Wanderer's custom name
			GenshinProcesor.UpdateCharacterName("wanderer", Properties.Settings.Default.WandererName);


			if (Properties.Settings.Default.ScanWeapons)
			{
				Logger.Info("Scanning weapons...");
                UserInterface.SetProgramStatus("Lecture des armes…");
				// Get Weapons
				Navigation.InventoryScreen();
				Navigation.SelectWeaponInventory();
				try
				{
                    weaponScraper.ScanWeapons();
				}
				catch (FormatException ex) { UserInterface.AddError(ex.Message); }
				catch (ThreadAbortException) { }
				catch (Exception ex)
				{
					UserInterface.AddError(ex.Message + "\n" + ex.StackTrace);
				}
				Navigation.MainMenuScreen();
				Logger.Info("Done scanning weapons");
                UserInterface.SetProgramStatus("Parcours des armes terminé ; traitement OCR en cours.");
			}

			if (Properties.Settings.Default.ScanArtifacts)
			{
				Logger.Info("Scanning artifacts...");
                UserInterface.SetProgramStatus("Lecture des artéfacts…");

				// Get Artifacts
				Navigation.InventoryScreen();
				Navigation.SelectArtifactInventory();
				try
				{
					artifactScraper.ScanArtifacts();
				}
				catch (FormatException ex) { UserInterface.AddError(ex.Message); }
				catch (ThreadAbortException) { }
				catch (Exception ex)
				{
					UserInterface.AddError(ex.Message + "\n" + ex.StackTrace);
				}
				Navigation.MainMenuScreen();
				Logger.Info("Done scanning artifacts");
                UserInterface.SetProgramStatus("Parcours des artéfacts terminé ; traitement OCR en cours.");
			}

			workerQueue.Enqueue(new OCRImageCollection(null, "END", 0));

			if (Properties.Settings.Default.ScanCharacters)
			{
				Logger.Info("Scanning characters...");
                UserInterface.SetProgramStatus("Lecture des personnages et aptitudes…");
				// Get characters
				Navigation.CharacterScreen();
				try
				{
					CharacterScraper.ScanCharacters(ref Characters);
				}
				catch (ThreadAbortException) { }
				catch (Exception ex)
				{
					UserInterface.AddError(ex.Message + "\n" + ex.StackTrace);
				}
				Navigation.MainMenuScreen();
				Logger.Info("Done scanning characters");
                UserInterface.SetProgramStatus("Lecture des personnages terminée : " + Characters.Count + " personnages valides.");
			}

			// Wait for Image Processors to finish
			AwaitProcessors();

			if (Properties.Settings.Default.ScanCharacters)
			{
				// Assign Artifacts to Characters
				if (Properties.Settings.Default.ScanArtifacts)
					AssignArtifacts();
				if (Properties.Settings.Default.ScanWeapons)
					AssignWeapons();
			}

			// Scan Character Development Items
			if (Properties.Settings.Default.ScanCharDevItems)
			{
				Logger.Info("Scanning character development materials...");
                UserInterface.SetProgramStatus("Lecture des matériaux de développement…");
				// Get Materials
				Navigation.InventoryScreen();
				Navigation.SelectCharacterDevelopmentInventory();
				HashSet<Material> devItems = new HashSet<Material>();
				try
				{
					materialScraper.SetInventoryPage(InventoryPage.CharacterDevelopmentItems);
					materialScraper.Scan_Materials(ref Inventory);
				}
				catch (FormatException ex) { UserInterface.AddError(ex.Message); }
				catch (ThreadAbortException) { }
				catch (Exception ex)
				{
					UserInterface.AddError(ex.Message + "\n" + ex.StackTrace);
				}
				Navigation.MainMenuScreen();
				Logger.Info("Done scanning character development materials");
                UserInterface.SetProgramStatus("Matériaux de développement parcourus.");
			}

			// Scan Materials
			if (Properties.Settings.Default.ScanMaterials)
			{
				Logger.Info("Scanning materials...");
                UserInterface.SetProgramStatus("Lecture des matériaux…");
				// Get Materials
				Navigation.InventoryScreen();
				Navigation.SelectMaterialInventory();
				HashSet<Material> materials = new HashSet<Material>();
				try
				{
					materialScraper.SetInventoryPage(InventoryPage.Materials);
					materialScraper.Scan_Materials(ref Inventory);
				}
				catch (FormatException ex) { UserInterface.AddError(ex.Message); }
				catch (ThreadAbortException) { }
				catch (Exception ex)
				{
					UserInterface.AddError(ex.Message + "\n" + ex.StackTrace);
				}
				Navigation.MainMenuScreen();
				Logger.Info("Done scanning materials");
                UserInterface.SetProgramStatus("Lecture des matériaux terminée.");
			}
		}

		private void AwaitProcessors()
		{
			while (ImageProcessors.Count > 0)
			{
				ImageProcessors.RemoveAll(process => !process.IsAlive);
                Thread.Sleep(10);
			}
			b_threadCancel = false;
		}

		public void ImageProcessorWorker()
		{
            try
            {
			Logger.Debug("Thread #{0} priority: {1}", Thread.CurrentThread.ManagedThreadId, Thread.CurrentThread.Priority);
			while (true)
			{
				if (b_threadCancel)
				{
					while (workerQueue.TryDequeue(out var discarded))
                        discarded.Bitmaps?.ForEach(bitmap => bitmap.Dispose());
					break;
				}

				if (workerQueue.TryDequeue(out OCRImageCollection imageCollection))
                {
                    try
                    {
					switch (imageCollection.Type)
					{
						case "weapon":
							if (weaponScraper.IsEnhancementMaterial(imageCollection.Bitmaps.First()))
							{
								Logger.Debug("Enhancement Material found for weapon #{weaponID}", imageCollection.Id);
								weaponScraper.StopScanning = true;
								break;
							}

							UserInterface.SetGearPictureBox(imageCollection.Bitmaps.Last());

							// Scan as weapon
							Weapon weapon = weaponScraper.CatalogueFromBitmapsAsync(imageCollection.Bitmaps, imageCollection.Id).Result;
							UserInterface.SetGear(imageCollection.Bitmaps.Last(), weapon);

							string weaponPath = $"./logging/weapons/weapon{weapon.Id}/";

							if (Properties.Settings.Default.LogScreenshots) Directory.CreateDirectory(weaponPath);

							if (weapon.IsValid())
							{
								UserInterface.IncrementWeaponCount();
								Inventory.Add(weapon);
								if (!string.IsNullOrWhiteSpace(weapon.EquippedCharacter))
									lock (equippedWeapons) equippedWeapons.Add(weapon);
							}
							else
							{
								UserInterface.AddError($"Unable to validate information for weapon ID#{weapon.Id}");
								string error = "";
								if (!weapon.HasValidWeaponName()) error += "Invalid weapon name\n";
								if (!weapon.HasValidRarity()) error += "Invalid weapon rarity\n";
								if (!weapon.HasValidLevel()) error += "Invalid weapon level\n";
								if (!weapon.HasValidRefinementLevel()) error += "Invalid refinement level\n";
								if (!weapon.HasValidEquippedCharacter()) error += "Inavlid equipped character\n";
								UserInterface.AddError(error + weapon.ToString());
								Directory.CreateDirectory(weaponPath);
								using (var writer = File.CreateText(weaponPath + "log.txt"))
								{
									writer.WriteLine($"Version: {Assembly.GetExecutingAssembly().GetName().Version.ToString(3)}");
									writer.WriteLine($"Resolution: {Navigation.GetWidth()}x{Navigation.GetHeight()}");
									writer.WriteLine($"Error log:\n\t{error.Replace("\n", "\n\t")}");
								}
							}

                            if (!weapon.IsValid() || Properties.Settings.Default.LogScreenshots)
                            {
                                Directory.CreateDirectory(weaponPath + "name");
                                imageCollection.Bitmaps[0].Save(weaponPath + "name/name.png");
                                Directory.CreateDirectory(weaponPath + "rarity");
                                imageCollection.Bitmaps[0].Save(weaponPath + "rarity/rarity.png");
                                Directory.CreateDirectory(weaponPath + "level");
                                imageCollection.Bitmaps[1].Save(weaponPath + "level/level.png");
                                Directory.CreateDirectory(weaponPath + "refinement");
                                imageCollection.Bitmaps[2].Save(weaponPath + "refinement/refinement.png");
                                Directory.CreateDirectory(weaponPath + "equipped");
                                imageCollection.Bitmaps[4].Save(weaponPath + "equipped/equipped.png");

                                imageCollection.Bitmaps.Last().Save(weaponPath + "card.png");
								Task.Run(() => LogObject(weapon, weaponPath + "weapon.json"));
                            }

                            // Dispose of everything

							break;

						case "artifact":
							if (ArtifactScraper.IsEnhancementMaterial(imageCollection.Bitmaps.Last()))
							{
								Logger.Debug("Enhancement Material found for artifact #{artifactID}", imageCollection.Id);
								artifactScraper.StopScanning = true;
								break;
							}

							UserInterface.SetGearPictureBox(imageCollection.Bitmaps.Last());
							// Scan as artifact
							Artifact artifact = ArtifactScraper.CatalogueFromBitmapsAsync(imageCollection.Bitmaps, imageCollection.Id).Result;
							UserInterface.SetGear(imageCollection.Bitmaps.Last(), artifact);

							string artifactPath = $"./logging/artifacts/artifact{artifact.Id}/";

                            if (Properties.Settings.Default.LogScreenshots) Directory.CreateDirectory(artifactPath);

							if (artifact.IsValid())
							{
								UserInterface.IncrementArtifactCount();
								Inventory.Add(artifact);
								if (!string.IsNullOrWhiteSpace(artifact.EquippedCharacter))
									lock (equippedArtifacts) equippedArtifacts.Add(artifact);
							}
							else
							{
								UserInterface.AddError($"Unable to validate information for artifact ID#{artifact.Id}");
								string error = "";
								if (!artifact.HasValidSlot()) error += "Invalid artifact gear slot\n";
								if (!artifact.HasValidSetName()) error += "Invalid artifact set name\n";
								if (!artifact.HasValidRarity()) error += "Invalid artifact rarity\n";
								if (!artifact.HasValidLevel()) error += "Invalid artifact level\n";
								if (!artifact.HasValidMainStat()) error += "Invalid artifact main stat\n";
								if (!artifact.HasValidSubStats()) error += "Invalid artifact sub stats\n";
								if (!artifact.HasValidEquippedCharacter()) error += "Invalid equipped character\n";
								UserInterface.AddError(error + artifact.ToString());
								Directory.CreateDirectory(artifactPath);
								using (var writer = File.CreateText(artifactPath + "log.txt"))
								{
									writer.WriteLine($"Version: {Assembly.GetExecutingAssembly().GetName().Version.ToString(3)}");
									writer.WriteLine($"Resolution: {Navigation.GetWidth()}x{Navigation.GetHeight()}");
									writer.WriteLine($"Error Log:\n\t{error.Replace("\n", "\n\t")}");
								}
							}

                            if (!artifact.IsValid() || Properties.Settings.Default.LogScreenshots)
                            {
                                Directory.CreateDirectory(artifactPath + "name");
                                imageCollection.Bitmaps[0].Save(artifactPath + "name/name.png");
                                Directory.CreateDirectory(artifactPath + "slot");
								imageCollection.Bitmaps[1].Save(artifactPath + "slot/slot.png");
                                Directory.CreateDirectory(artifactPath + "mainstat");
                                imageCollection.Bitmaps[2].Save(artifactPath + "mainstat/mainstat.png");
								Directory.CreateDirectory(artifactPath + "level");
								imageCollection.Bitmaps[3].Save(artifactPath + "level/level.png");
								Directory.CreateDirectory(artifactPath + "substats");
								imageCollection.Bitmaps[4].Save(artifactPath + "substats/substats.png");
								Directory.CreateDirectory(artifactPath + "equipped");
								imageCollection.Bitmaps[5].Save(artifactPath + "equipped/equipped.png");
								Directory.CreateDirectory(artifactPath + "locked");
								imageCollection.Bitmaps[6].Save(artifactPath + "locked/locked.png");

								imageCollection.Bitmaps.Last().Save(artifactPath + "card.png");

								Task.Run(()=>LogObject(artifact, artifactPath + "artifact.json"));
							}

							// Dispose of everything

							break;

						case "END":
							b_threadCancel = true;
							break;

						default:
							MainForm.UnexpectedError("Unknown Image type for Image Processor");
							break;
                    }
                    }
                    catch(ThreadAbortException) { throw; }
                    catch(Exception ex) when (!(ex is OutOfMemoryException))
                    {
                        string detail="OCR "+imageCollection.Type+" #"+imageCollection.Id+" : pièce ignorée, poursuite du parcours."+Environment.NewLine+OcrFailure.Describe(ex);
                        UserInterface.AddError(detail);Logger.Error(ex,detail);
                        try
                        {
                            string folder=Path.Combine("logging","ocr-errors",imageCollection.Type+"-"+imageCollection.Id);
                            Directory.CreateDirectory(folder);File.WriteAllText(Path.Combine(folder,"error.txt"),detail);
                            imageCollection.Bitmaps?.LastOrDefault()?.Save(Path.Combine(folder,"card.png"));
                        }
                        catch(Exception diagnosticError){Logger.Warn(diagnosticError,"Unable to save OCR diagnostic");}
                    }
                    finally { imageCollection.Bitmaps?.ForEach(bitmap=>bitmap?.Dispose()); }
                }
                else
                {
                    // Wait for more images to process
					Thread.Sleep(250);
				}
			}
            }
            catch (Exception ex)
            {
                b_threadCancel = true;
                UserInterface.AddError("Arrêt global du traitement OCR : " + OcrFailure.Describe(ex));
                Logger.Error(ex, "OCR worker failed");
            }
			Logger.Debug("Thread {threadId} exit", Thread.CurrentThread.ManagedThreadId);
		}

        private static void LogObject(object obj, string path)
        {
            using (var file = new StreamWriter(path))
            {
                var serializer = new JsonSerializer
                {
                    Formatting = Formatting.Indented
                };
                serializer.Serialize(file, obj);
            }
        }

        public void AssignArtifacts()
		{
			foreach (Artifact artifact in equippedArtifacts)
			{
				foreach (Character character in Characters)
				{
					if (artifact.EquippedCharacter == character.NameGOOD)
					{
						character.AssignArtifact(artifact); // Do we even need to do this?
						Logger.Debug("Assigned {fearSlot} to {character}", artifact.GearSlot, character.NameGOOD);
						break;
					}
				}
			}
		}

		public void AssignWeapons()
		{
			foreach (Character character in Characters)
			{
				foreach (Weapon weapon in equippedWeapons)
				{
					if (weapon.EquippedCharacter == character.NameGOOD)
					{
						character.AssignWeapon(weapon);
						Logger.Debug("Assigned {weapon} to {character}", weapon.Name, character.NameGOOD);
						break;
					}
				}
				if (character.Weapon is null)
				{
					UserInterface.AddError("Arme équipée inconnue pour " + character.NameGOOD + ". Aucune arme de remplacement n’a été inventée.");
				}
			}
		}
	}
}
