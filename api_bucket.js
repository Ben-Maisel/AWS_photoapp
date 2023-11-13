//
// app.get('/bucket?startafter=bucketkey', async (req, res) => {...});
//
// Retrieves the contents of the S3 bucket and returns the 
// information about each asset to the client. Note that it
// returns 12 at a time, use startafter query parameter to pass
// the last bucketkey and get the next set of 12, and so on.
//
const { ListObjectsV2Command } = require('@aws-sdk/client-s3'); // used to list objects in S3 bucket
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');
// const dbConnection = require('./database.js')
// const { HeadBucketCommand } = require('@aws-sdk/client-s3'); 

exports.get_bucket = async (req, res) => {  // defining an exported function get_bucket that runs when the endpoint /bucket is called

  console.log("call to /bucket..."); // log message to show /bucket endpoint was accessed

  try {
    const StartAfter = req.query.startafter || ''; // define variable StartAfter as the query parameter startafter
    const command = new ListObjectsV2Command({
      Bucket: s3_bucket_name,
      StartAfter: StartAfter,
      MaxKeys: 12
    });

    const data = await s3.send(command); // send the command to S3 and get the response

    if (data.KeyCount === 0) {
      return res.json({
        "s3_status": 200,
        "message": "success",
        "data": []
      });
    }

    if (data.Contents.length === 12) {
      data.nextPageStartAfter = data.Contents[11].Key;
    }

    var formatted_data = data.Contents.map(asset => {
      return {
        Key: asset.Key,
        LastModified: asset.LastModified,
        Etag: asset.ETag,
        Size: asset.Size,
        StorageClass: asset.StorageClass
      }
    });

    res.json({
      "s3_status": 200,
      "message": "success",
      "data": formatted_data

    }); // send the response to the client

    console.log("call to /bucket done"); // log message to show /bucket endpoint was accessed
  }

  catch (code_err) {
    res.status(500).json({ error: "Server Error" });
  };

}



    //
    // TODO: remember, 12 at a time...  Do not try to cache them here, instead
    // request them 12 at a time from S3
    //
    // AWS:
    //   https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
    //   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/listobjectsv2command.html
    //   https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
    //

