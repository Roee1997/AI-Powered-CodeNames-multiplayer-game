using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class MoveManager
    {
        public bool LogMove(MoveRequest move)
        {
            DBservices db = new DBservices();
            return db.LogMove(move);
        }
    }
}
