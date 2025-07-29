using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;
using System.Diagnostics;


namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FriendsController : ControllerBase
    {
        // POST: api/friends/request
        [HttpPost("request")]
        public IActionResult SendFriendRequest([FromBody] FriendRequestPayload payload)
        {
            try
            {
                string result = Friend.SendFriendRequest(payload.SenderID, payload.ReceiverQuery);

                return result switch
                {
                    "FriendRequestSent" => Ok(new { message = "בקשת החברות נשלחה בהצלחה." }),
                    "AlreadyPending" => Conflict(new { message = " בקשת חברות כבר ממתינה לאישור." }),
                    "AlreadyFriends" => BadRequest(new { message = " אתם כבר חברים." }),
                    "CannotSendToSelf" => BadRequest(new { message = " לא ניתן לשלוח בקשת חברות לעצמך." }),
                    "ReceiverNotFound" => NotFound(new { message = " המשתמש לא נמצא." }),
                    _ => BadRequest(new { message = "שגיאה כללית בשליחת הבקשה." })
                };
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "שגיאה בשרת: " + ex.Message });
            }
        }

        // Payload model for friend request
        public class FriendRequestPayload
        {
            public string SenderID { get; set; }
            public string ReceiverQuery { get; set; } // Username or Email
        }


        //find user to add to friend list
        [HttpGet("search")]
        public IActionResult SearchUser([FromQuery(Name = "query")] string query)
        {
            try
            {
                server_codenames.BL.Users user = server_codenames.BL.Users.GetUserByUsernameOrID(query);
                if (user != null)
                {
                    return Ok(user); // מצא משתמש
                }
                return NotFound(new { message = "המשתמש לא נמצא." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "שגיאה בשרת: " + ex.Message });
            }
        }


        [HttpGet("pending-sent/{senderId}")]
        public IActionResult GetPendingSentRequests(string senderId)
        {
            try
            {
                var list = server_codenames.BL.Friend.GetPendingSent(senderId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("pending-received/{receiverId}")]
        public IActionResult GetPendingReceivedRequests(string receiverId)
        {
            try
            {
                var list = server_codenames.BL.Friend.GetPendingReceived(receiverId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }


        [HttpPut("cancel")]
        public IActionResult CancelRequest([FromBody] CancelRequestPayload payload)
        {
            try
            {
                string result = Friend.CancelFriendRequest(payload.SenderID, payload.ReceiverID, payload.Action);
                return result == "RequestUpdated"
                    ? Ok(new { message = "הבקשה עודכנה בהצלחה." })
                    : BadRequest(new { message = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "שגיאה בשרת: " + ex.Message });
            }
        }

        // Payload model for cancel request
        public class CancelRequestPayload
        {
            public string SenderID { get; set; }
            public string ReceiverID { get; set; }
            public string Action { get; set; } // "cancel" or "decline"
        }



        [HttpPut("accept")]
        public IActionResult AcceptFriendRequest([FromBody] AcceptRequestPayload payload)
        {
            Debug.WriteLine("==> Controller: AcceptFriendRequest");
            Debug.WriteLine("SenderID: " + payload.SenderID);
            Debug.WriteLine("ReceiverID: " + payload.ReceiverID);

            try
            {
                string result = server_codenames.BL.Friend.AcceptFriendRequestAndInsertFriendship(payload.SenderID, payload.ReceiverID);
                Debug.WriteLine("==> Controller Result: " + result);

                if (result == "FriendshipCreated")
                    return Ok(new { message = "Friendship created successfully." });

                else if (result == "AlreadyFriends")
                    return Ok(new { message = "Users are already friends." });

                else if (result == "RequestNotFound")
                    return BadRequest(new { message = "No matching pending request found." });

                else
                    return BadRequest(new { message = result });
            }
            catch (Exception ex)
            {
                Debug.WriteLine("==> Controller EXCEPTION: " + ex.Message);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // Payload class for accepting friend requests – contains SenderID and ReceiverID
        public class AcceptRequestPayload
        {
            public string SenderID { get; set; }
            public string ReceiverID { get; set; }
        }


        [HttpGet("{userId}")]
        public IActionResult GetFriends(string userId)
        {
            Debug.WriteLine("==> Controller: GetFriends called for userId = " + userId);

            try
            {
                var friends = server_codenames.BL.Friend.GetFriends(userId);
                return Ok(friends);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("==> Controller ERROR: " + ex.Message);
                return StatusCode(500, new { message = ex.Message });
            }
        }


        [HttpPut("remove")]
        public IActionResult RemoveFriend([FromBody] RemoveFriendPayload payload)
        {
            Debug.WriteLine("==> Controller: RemoveFriend");
            Debug.WriteLine("UserID: " + payload.UserID);
            Debug.WriteLine("FriendID: " + payload.FriendID);

            try
            {
                string result = server_codenames.BL.Friend.RemoveFriend(payload.UserID, payload.FriendID);

                if (result == "FriendRemoved")
                    return Ok(new { message = "Friend removed successfully." });

                else
                    return BadRequest(new { message = result });
            }
            catch (Exception ex)
            {
                Debug.WriteLine("==> Controller EXCEPTION: " + ex.Message);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // Payload class for removing friend
        public class RemoveFriendPayload
        {
            public string UserID { get; set; }
            public string FriendID { get; set; }
        }

    }








}
