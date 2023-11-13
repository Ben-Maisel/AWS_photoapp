//
// app.post('/image/:userid', async (req, res) => {...});
//
// Uploads an image to the bucket and updates the database,
// returning the asset id assigned to this image.
//
const dbConnection = require('./database.js')
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3, s3_bucket_name, s3_region_name } = require('./aws.js');

const { v4: uuidv4 } = require('uuid');

exports.post_image = async (req, res) => {

  console.log("call to /image...");

  try {

    var data = req.body;  // data => JS object
    const userid = String(req.params.userid);
    var asset_name = data.assetname
    var image_encoding = data.data
    var decoded_image = Buffer.from(image_encoding, 'base64'); // Built in node.js tool that will convert the base64 string back into its binary form

    var sql = `
      SELECT userid
      FROM users;  
    `;

    const users = await new Promise((resolve, reject) => {
      dbConnection.query(sql, (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results);
      });
    });

    const userIDs = users.map(user => JSON.stringify(user.userid));


    if (userIDs.includes(userid)) {
      console.log('userid found in database');

      var sql3 = `
        SELECT bucketfolder
        FROM users
        WHERE userid = ?
      `;
      var data_value = [userid];
      const folder = await new Promise((resolve, reject) => {
        dbConnection.query(sql3, data_value, (err, results) => {
          if (err) {
            return reject(err);
          }

          resolve(results);
        });
      });

      // var formatted_folder = folder.map(f => JSON.stringify(f.bucketfolder));


      const image_key = uuidv4();



      var sql2 = `
        INSERT INTO assets (userid, assetname, bucketkey)
        VALUES (?, ?, ?)
      `;
      var data_values = [userid, asset_name, image_key];
      const insert_results = await new Promise((resolve, reject) => {
        dbConnection.query(sql2, data_values, (err, results) => {
          if (err) {
            return reject(err);
          }

          resolve(results);
        });
      });

      const upload_data = {
        Bucket: s3_bucket_name,
        Key: folder[0].bucketfolder + '/' + image_key,
        Body: decoded_image,
        ContentType: "image/jpeg",
        ACL: 'public-read' //make sure it is public so we can test w/ it and access it

      };
      console.log(upload_data.Key);

      try {
        const command = new PutObjectCommand(upload_data);
        const upload_results = await s3.send(command);
      }
      catch (err) {
        console.log("S3 Upload Error: ", err);
        throw err; // this will make the other catch block get the error
      }

      res.status(200).json({
        "message": "success",
        "assetid": insert_results.insertId
      });
    }
    if (!userIDs.includes(userid)) {

      console.log('user not found');


      res.status(400).json({
        message: "no such user...",
        "assetid": -1
      });


      return;
    }


  }//try
  catch (err) {
    console.log("**ERROR:", err.message);

    res.status(400).json({
      message: "no such user...",
      "assetid": -1
    });
  }//catch

}//post
