//
// app.get('/download/:assetid', async (req, res) => {...});
//
// downloads an asset from S3 bucket and sends it back to the
// client as a base64-encoded string.
//
const dbConnection = require('./database.js')
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');
const { resolve } = require('dns');

exports.get_download = async (req, res) => {

  console.log("call to /download...");

  try {

    function queryDatabase(sql) {
      return new Promise((resolve, reject) => {
        dbConnection.query(sql, (err, results, _) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(results);

        });
      });
    }

    const assetid = String(req.params.assetid); // gets asset id from parameter /download/param

    var sql = `
      SELECT assetid, assetname, bucketkey, assets.userid, bucketfolder
      FROM assets
      INNER JOIN users ON assets.userid = users.userid;
    `;
    const data = await queryDatabase(sql);


    // GOING TO NEED TO EDIT THIS FOR AUTOGRADER DATABASE
    var formatted_data = data.map(asset => {
      return {
        assetid: String(asset.assetid),
        assetname: asset.assetname,
        // bucketkey: String(asset.bucketfolder) + '/' + String(asset.bucketkey),
        bucketkey: asset.bucketkey,
        userid: asset.userid,
        // bucketfolder: asset.bucketfolder
      }
    });

    const assetdata = formatted_data.find(asset => asset.assetid === assetid);

    if (assetdata === undefined) {
      res.status(400).json({
        "s3_status": 400,
        "message": "no such asset...",
        "user_id": -1,
        "asset_name": "?",
        "bucket_key": "?",
        data: []
      });
      return;
    }
    var full_key = assetdata.bucketkey;

    const command = new GetObjectCommand({
      Bucket: s3_bucket_name,
      Key: full_key
    });

    const response = await s3.send(command);

    var datastr = await response.Body.transformToString("base64");
    res.json({
      "s3_status": 200,
      "message": "success",
      "user_id": assetdata.userid,
      "asset_name": assetdata.assetname,
      "bucket_key": full_key,
      data: datastr

    }); // send the response to the client




  }//try
  catch (err) {
    //
    // generally we end up here if we made a 
    // programming error, like undefined variable
    // or function:
    //
    res.status(400).json({
      "message": err.message,
      "user_id": -1,
      "asset_name": "?",
      "bucket_key": "?",
      "data": []
    });
  }//catch

}//get

//
// TODO
//
// MySQL in JS:
//   https://expressjs.com/en/guide/database-integration.html#mysql
//   https://github.com/mysqljs/mysql
// AWS:
//   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
//   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/getobjectcommand.html
//   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
//