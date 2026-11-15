using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace InventoryKamera
{
    internal static class ClientSync
    {
        private sealed class Connection
        {
            public string Url, ProtectedToken, AccountId, Username;
        }
        private static readonly string Folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GenshinTracker");
        private static readonly string ConfigPath = Path.Combine(Folder, "connection.json");
        private static readonly SemaphoreSlim Sending = new SemaphoreSlim(1, 1);
        private static readonly object ConfigLock = new object();
        internal static Action<string, bool> StatusChanged;
        private static void Status(string text, bool ok = true) { StatusChanged?.Invoke(text, ok); }
        private static Connection Load()
        {
            lock (ConfigLock) return File.Exists(ConfigPath) ? JsonConvert.DeserializeObject<Connection>(File.ReadAllText(ConfigPath)) : null;
        }
        internal static string SiteUrl => Load()?.Url ?? "http://localhost:8788";
        internal static string AccountName => Load()?.Username;
        private static string ValidateUrl(string input)
        {
            if (!Uri.TryCreate(input?.Trim(), UriKind.Absolute, out var uri) ||
                !(uri.Scheme == "https" || (uri.Scheme == "http" && uri.IsLoopback)) ||
                !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) ||
                !string.IsNullOrEmpty(uri.Fragment) || uri.AbsolutePath != "/")
                throw new ArgumentException("Utilisez l’adresse HTTPS du site (HTTP permis uniquement sur localhost). Sans chemin ni identifiants.");
            return uri.GetLeftPart(UriPartial.Authority);
        }
        private static HttpClient Client(string url)
        {
            return new HttpClient(new HttpClientHandler { AllowAutoRedirect = false })
            { BaseAddress = new Uri(ValidateUrl(url)), Timeout = TimeSpan.FromSeconds(30) };
        }
        internal static async Task Pair(string url, string code)
        {
            url = ValidateUrl(url);
            if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Saisissez le code créé sur le site.");
            using (var client = Client(url))
            using (var response = await client.PostAsync("/api/device/pair", new StringContent(
                JsonConvert.SerializeObject(new { code = code.Trim(), deviceName = Environment.MachineName }), Encoding.UTF8, "application/json")))
            {
                string text = await response.Content.ReadAsStringAsync();
                var result = JObject.Parse(text);
                if (!response.IsSuccessStatusCode) throw new InvalidOperationException((string)result["error"] ?? "Association refusée.");
                string token = (string)result["token"], accountId = (string)result["accountId"], username = (string)result["username"];
                if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(accountId) || accountId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
                    throw new InvalidDataException("Réponse d’association invalide.");
                var config = new Connection { Url = url, AccountId = accountId, Username = username,
                    ProtectedToken = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(token), null, DataProtectionScope.CurrentUser)) };
                lock (ConfigLock)
                {
                    Directory.CreateDirectory(Folder);
                    string temporary = ConfigPath + ".tmp";
                    File.WriteAllText(temporary, JsonConvert.SerializeObject(config));
                    if (File.Exists(ConfigPath)) File.Replace(temporary, ConfigPath, null);
                    else File.Move(temporary, ConfigPath);
                }
                Status("Associé au compte « " + username + " ». Les prochains scans seront envoyés automatiquement.");
            }
        }
        private static string QueueFolder(Connection config)
        {
            // Bind pending scans to both the account and site; changing accounts cannot upload old data.
            using (var sha = SHA256.Create())
            {
                string identity = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(config.Url + "|" + config.AccountId))).Replace("-", "");
                return Path.Combine(Folder, "outbox", identity);
            }
        }
        internal static void Enqueue(string goodPath, string reportPath)
        {
            try
            {
                var config = Load();
                if (config == null) { Status("Export local enregistré. Associez un compte dans Connexion pour les prochains scans."); return; }
                string good = File.ReadAllText(goodPath), report = File.ReadAllText(reportPath), scanId;
                using (var sha = SHA256.Create()) scanId = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(good + report))).Replace("-", "");
                var payload = new JObject { ["scanId"] = scanId, ["capturedAt"] = File.GetLastWriteTimeUtc(goodPath).ToString("o"),
                    ["good"] = JObject.Parse(good), ["report"] = JObject.Parse(report) };
                string queue = QueueFolder(config); Directory.CreateDirectory(queue);
                File.WriteAllText(Path.Combine(queue, scanId + ".json"), payload.ToString(Formatting.None));
                Task.Run((Func<Task>)SendPending);
            }
            catch (Exception) { Status("Export local conservé. Impossible de préparer l’envoi ; vérifiez la connexion et l’espace disque.", false); }
        }
        internal static async Task SendPending()
        {
            if (!await Sending.WaitAsync(0)) return;
            try
            {
                var config = Load();
                if (config == null) { Status("Associez votre compte depuis l’onglet Connexion.", false); return; }
                string queue = QueueFolder(config);
                if (!Directory.Exists(queue) || Directory.GetFiles(queue, "*.json").Length == 0) { Status("Aucun envoi en attente. Le prochain scan sera synchronisé."); return; }
                string token = Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(config.ProtectedToken), null, DataProtectionScope.CurrentUser));
                using (var client = Client(config.Url))
                {
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    foreach (string file in Directory.GetFiles(queue, "*.json"))
                    {
                        Status("Synchronisation du relevé en cours…");
                        using (var response = await client.PostAsync("/api/sync", new StringContent(File.ReadAllText(file), Encoding.UTF8, "application/json")))
                        {
                            if (!response.IsSuccessStatusCode)
                            {
                                Status(response.StatusCode == System.Net.HttpStatusCode.Unauthorized
                                    ? "Association révoquée ou expirée. Associez de nouveau ce PC ; les exports restent conservés."
                                    : "Envoi refusé par le site. Le relevé reste en attente ; consultez les exports et réessayez.", false);
                                return;
                            }
                            var receipt = JObject.Parse(await response.Content.ReadAsStringAsync());
                            if ((bool?)receipt["ok"] != true) throw new InvalidDataException("Accusé de réception invalide.");
                        }
                        File.Delete(file);
                    }
                }
                Status("Synchronisé avec « " + config.Username + " ». Consultez le journal sur le site pour les relevés partiels.");
            }
            catch (Exception) { Status("Site inaccessible. Les relevés sont conservés en attente ; utilisez Réessayer l’envoi.", false); }
            finally { Sending.Release(); }
        }
    }
}
