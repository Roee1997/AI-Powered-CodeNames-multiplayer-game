using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class GuessPayload
    {
        public string UserID { get; set; }
        public string GuessType { get; set; }
    }
}
