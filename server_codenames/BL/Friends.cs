using Server_codenames.DAL;
using System.Diagnostics;

namespace server_codenames.BL
{
    public class Friend
    {
        public string UserID { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }

        public Friend() { }

        // Static method to send a friend request
        public static string SendFriendRequest(string senderId, string receiverQuery)
        {
            DBservices dbs = new DBservices();
            return dbs.SendFriendRequestDB(senderId, receiverQuery);
        }


        public static List<server_codenames.BL.Users> GetPendingSent(string senderId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetPendingFriendRequestsSent(senderId);
        }


        public static List<server_codenames.BL.Users> GetPendingReceived(string receiverId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetPendingFriendRequestsReceived_DB(receiverId);
        }


        public static string CancelFriendRequest(string senderId, string receiverId, string action)
        {
            DBservices dbs = new DBservices();
            return dbs.CancelFriendRequestDB(senderId, receiverId, action);
        }

        // Delegates friend request acceptance and friendship insertion to DBservices layer.
        public static string AcceptFriendRequestAndInsertFriendship(string senderID, string receiverID)
        {
            Debug.WriteLine("==> BL: AcceptFriendRequestAndInsertFriendship");
            DBservices dbs = new DBservices();
            string result = dbs.AcceptFriendRequestAndInsertFriendship(senderID, receiverID);
            Debug.WriteLine("==> BL Result: " + result);
            return result;
        }

        // Gets friends list by user UID from DB
        public static List<Dictionary<string, object>> GetFriends(string userId)
        {
            Debug.WriteLine("==> BL: GetFriends for userId = " + userId);
            DBservices dbs = new DBservices();
            return dbs.GetFriendsByUserID(userId);
        }

        // Removes a friend and updates the friend request status to 'Unfriended'
        public static string RemoveFriend(string userId, string friendId)
        {
            Debug.WriteLine("==> BL: RemoveFriend");
            DBservices dbs = new DBservices();
            string result = dbs.RemoveFriendshipAndUpdateStatus(userId, friendId);
            Debug.WriteLine("==> BL Result: " + result);
            return result;
        }

    }
}
