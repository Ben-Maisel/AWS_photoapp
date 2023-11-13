//
// app.get('/assets', async (req, res) => {...});
//
// Return all the assets from the database:
//
const dbConnection = require('./database.js')
const { HeadBucketCommand } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');

exports.get_assets = async (req, res) => {

  console.log("call to /assets...");

  try {
    var input = {
      Bucket: s3_bucket_name
    };

    console.log("/assets: calling S3...")

    var command = new HeadBucketCommand(input);
    var s3_response = s3.send(command)

    var rds_response = new Promise((resolve, reject) => {
      try {
        console.log("/assets: calling RDS...")

        var sql = `
          SELECT assetid, userid, assetname, bucketkey
          FROM assets
          ORDER BY assetid ASC;
          `;

        dbConnection.query(sql, (err, results, _) => {
          try {
            if (err) {
              reject(err);
              return;
            }
            console.log("/assets query done")
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
        var s3_result = results[0];
        var rds_results = results[1];

        var metadata = s3_result["$metadata"]


        var formatted_assets = rds_results.map(asset => {
          return {
            assetid: asset.assetid,
            userid: asset.userid,
            assetname: asset.assetname,
            bucketkey: asset.bucketkey
          };
        });
        console.log("/assets done, sending response...");

        res.json({
          "mesage": "success",
          "data": formatted_assets
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


      res.status(400).json({
        "message": err.message,
        "s3_status": -1,
        "data": -1
      });
    });
  }
  catch (err) {
    res.status(400).json({
      "message": err.message,
      "s3_status": -1,
      "data": -1
    });
  }
}















