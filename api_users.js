//
// app.get('/users', async (req, res) => {...});
//
// Return all the users from the database:
//
const dbConnection = require('./database.js')
const { HeadBucketCommand } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');

exports.get_users = async (req, res) => {

  console.log("call to /users...");

  try {
    var input = {
      Bucket: s3_bucket_name // Specifying the S3 bucket name.
    };

    console.log("/users: calling S3...");

    var command = new HeadBucketCommand(input); //aws library func that checks if bucket exists and can be accessed
    var s3_response = s3.send(command);


    var rds_response = new Promise((resolve, reject) => {
      try {
        console.log("/users: calling RDS...");

        var sql = `
          SELECT userid, email, lastname, firstname, bucketfolder
          FROM users
          ORDER BY userid ASC;
          `;


        dbConnection.query(sql, (err, results, _) => {
          try {
            if (err) {
              reject(err);
              return;
            }
            console.log("/users query done");
            resolve(results);
          }
          catch (code_err) {
            reject(code_err);
          }
        });
      }
      catch (code_err) {
        reject(code_err);
      }
    });



    Promise.all([s3_response, rds_response]).then(results => {
      try {
        // we have a list of results, so break them apart:
        var s3_result = results[0];
        var rds_results = results[1];
        console.log(typeof rds_results, rds_results);

        // extract the s3 result:
        var metadata = s3_result["$metadata"];

        // extract the db result, which is a list of lists:
        var users = rds_results;  // first list:

        var formatted_users = users.map(user => {
          return {
            userid: user.userid,
            email: user.email,
            lastname: user.lastname,
            firstname: user.firstname,
            bucketfolder: user.bucketfolder
          };

        });
        //
        // done, respond with stats:
        //
        console.log("/users done, sending response...");

        res.json({
          "message": "success",
          // "s3_status": metadata["httpStatusCode"],
          "data": formatted_users
        });
      }
      catch (code_err) {
        res.status(400).json({
          "message": code_err.message,
          "s3_status": -1,
          "data": -1
        });
      }
    }).catch(err => {
      //
      // we get here if calls to S3 or RDS failed, or we
      // failed to process the results properly:
      //
      res.status(400).json({
        "message": err.message,
        "s3_status": -1,
        "data": -1,

      });
    });
  }//try
  catch (err) {
    //
    // generally we end up here if we made a 
    // programming error, like undefined variable
    // or function:
    //
    res.status(400).json({
      "message": err.message,
      "s3_status": -1,
      "data": -1
    });
  }//catch

}//get





