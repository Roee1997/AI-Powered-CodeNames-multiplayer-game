using Server_codenames.DAL;

namespace server_codenames.BL
{
public class GuessRequest
{
    public string ClueWord { get; set; }
    public int ClueNumber { get; set; }
    public List<string> BoardWords { get; set; }
    public string Team { get; set; }
     }
}