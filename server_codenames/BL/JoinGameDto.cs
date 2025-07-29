 using Server_codenames.DAL;

namespace server_codenames.BL
{
 public class JoinGameDto
    {
         public string UserID { get; set; }
        public string Username { get; set; }  
        public string Team { get; set; }
        public bool IsSpymaster { get; set; }
    }
}
