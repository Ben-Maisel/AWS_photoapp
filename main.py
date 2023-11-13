#
# Client-side python app for photoapp, this time working with
# web service, which in turn uses AWS S3 and RDS to implement
# a simple photo application for photo storage and viewing.
#
# Project 02 for CS 310
#
# Authors:
#   BEN MAISEL
#   Prof. Joe Hummel (initial template)
#   Northwestern University
#   CS 310
#

import requests  # calling web service
import jsons  # relational-object mapping

import uuid
import pathlib
import logging
import sys
import os
import base64

from configparser import ConfigParser

import matplotlib.pyplot as plt
import matplotlib.image as img


###################################################################
#
# classes
#
class User:

  def __init__(self, userid: int, email: str, lastname: str, firstname: str,
               bucketfolder: str):
    self.userid = userid
    self.email = email
    self.lastname = lastname
    self.firstname = firstname
    self.bucketfolder = bucketfolder


class Asset:

  def __init__(self, assetid: int, userid: int, assetname: str,
               bucketkey: str):
    self.assetid = assetid
    self.userid = userid
    self.assetname = assetname
    self.bucketkey = bucketkey


class BucketItem:

  def __init__(self, Key: str, LastModified: str, ETag: str, Size: int,
               StorageClass: str):
    self.Key = Key
    self.LastModified = LastModified
    self.ETag = ETag
    self.Size = Size
    self.StorageClass = StorageClass


###################################################################
#
# prompt
#
def prompt():
  """
  Prompts the user and returns the command number
  
  Parameters
  ----------
  None
  
  Returns
  -------
  Command number entered by user (0, 1, 2, ...)
  """
  print()
  print(">> Enter a command:")
  print("   0 => end")
  print("   1 => stats")
  print("   2 => users")
  print("   3 => assets")
  print("   4 => download")
  print("   5 => download and display")
  print("   6 => bucket contents")

  cmd = int(input())
  return cmd


###################################################################
#
# stats
#
def stats(baseurl):
  """
  Prints out S3 and RDS info: bucket status, # of users and 
  assets in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/stats'
    url = baseurl + api

    res = requests.get(url)
    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract stats:
    #
    body = res.json()
    #
    print("bucket status:", body["message"])
    print("# of users:", body["db_numUsers"])
    print("# of assets:", body["db_numAssets"])

  except Exception as e:
    logging.error("stats() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# users
#
def users(baseurl):
  """
  Prints out all the users in the database
  
  Parameters
  ----------
  baseurl: baseurl for web service
  
  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/users'
    url = baseurl + api

    res = requests.get(url)

    #
    # let's look at what we got back:
    #
    if res.status_code != 200:
      # failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:  # we'll have an error message
        body = res.json()
        print("Error message:", body["message"])
      #
      return

    #
    # deserialize and extract users:
    #
    body = res.json()
    #
    # let's map each dictionary into a User object:
    #
    users = []
    for row in body["data"]:
      user = User(**row)
      users.append(user)
    #
    # Now we can think OOP:
    #
    for user in users:
      print(user.userid)
      print(" ", user.email)
      print(" ", user.lastname, ",", user.firstname)
      print(" ", user.bucketfolder)

  except Exception as e:
    logging.error("users() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


#########################################################################
###################################################################
#
# assets
#


def assets(baseurl):
  """
  Prints out all the assets in the database

  Parameters
  ----------
  baseurl: baseurl for web service

  Returns
  -------
  nothing
  """

  try:
    #
    # call the web service:
    #
    api = '/assets'
    url = baseurl + api

    res = requests.get(url)

    if res.status_code != 200:
      #failed:
      print("Failed with status code:", res.status_code)
      print("url: " + url)
      if res.status_code == 400:
        body = res.json()
        print("Error message:", body["message"])

      return

    body = res.json()
    # print(body["data"])
    assets = []
    for row in body["data"]:
      asset = Asset(
        **row
      )  #**row unpacks dictionary into keyword arguments that the constructor can use
      assets.append(asset)

    for asset in assets:
      print(asset.assetid)
      print(" ", asset.userid)
      print(" ", asset.assetname)
      print(" ", asset.bucketkey)

  except Exception as e:
    logging.error("assets() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# download
#
def download(baseurl, display):
  """
  download asset from the database

  Parameters
  ----------
  baseurl: baseurl for web service
  display: display downloaded asset or not

  Returns
  -------
  nothing
  """

  try:
    requested_asset = str(input("Enter asset id>\n"))
    api = '/download'
    url = baseurl + api + '/' + requested_asset
    # print(url)
    res = requests.get(url)

    if res.status_code != 200:
      if res.status_code == 400:
        print("Failed with status code:", res.status_code)
        print("url: " + url)
        print("Error message: ", "no such asset...")
        return

      # print('status:', res.status_code)
      print('No such asset...')
      return
      # print("Failed with status code:", res.status_code)
      # print("url: " + url)
      # if res.status_code == 400:
      #   body = res.json()
      #   print("Error message:", body["message"])
      # return

    body = res.json()
    assetname = str(body["asset_name"])
    userid = body["user_id"]
    bucketkey = body["bucket_key"]
    image_encoding = body["data"]

    if isinstance(image_encoding, str):
      decoded_image = base64.b64decode(image_encoding)
    else:
      print('No such asset...')
      return

    with open(assetname, 'wb') as outfile:
      outfile.write(decoded_image)

    print('userid:', userid)
    print('asset name:', assetname)
    print('bucket key:', bucketkey)
    print(f"Downloaded from S3 and saved as ' {assetname} '")

    if (display):
      image = img.imread(assetname)
      plt.imshow(image)
      plt.show()

  except Exception as e:
    logging.error("download() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
#
# list_bucket
#
def list_bucket(baseurl):
  """
  print info about each bucket asset returned in response

  Parameters
  ----------
  baseurl: baseurl for web service

  Returns
  -------
  nothing
  """

  try:
    api = '/bucket'
    url = baseurl + api

    def inner_loop(current_url):

      res = requests.get(current_url)

      if res.status_code != 200:
        #failed:
        print("Failed with status code:", res.status_code)
        print("url: " + current_url)
        if res.status_code == 400:
          body = res.json()
          print("Error message:", body["message"])

        return

      body = res.json()
      bucket_assets = []
      for row in body["data"]:
        item = BucketItem(
          **row
        )  #**row unpacks dictionary into keyword arguments that   the constructor can use
        bucket_assets.append(item)

      if len(bucket_assets) == 0:
        return

      for item in bucket_assets:
        print(item.Key)
        print(' ', item.LastModified)
        print(' ', item.Size)

      more_pages = input("another page? [y/n]\n")
      if more_pages != 'y':
        return
      else:
        if len(bucket_assets) != 12:
          return
        last_key = bucket_assets[-1].Key
        new_url = url + '?startafter=' + last_key
        # print(
        #   '-----------------------------------------------------------------')
        # print(new_url)
        inner_loop(new_url)

    inner_loop(url)

  except Exception as e:
    logging.error("list_bucket() failed:")
    logging.error("url: " + url)
    logging.error(e)
    return


###################################################################
# main
#
print('** Welcome to PhotoApp v2 **')
print()

# eliminate traceback so we just get error message:
sys.tracebacklimit = 0

#
# what config file should we use for this session?
#
config_file = 'photoapp-client-config.ini'

print("What config file to use for this session?")
print("Press ENTER to use default (photoapp-client-config.ini),")
print("otherwise enter name of config file>")
s = input()

if s == "":  # use default
  pass  # already set
else:
  config_file = s

#
# does config file exist?
#
if not pathlib.Path(config_file).is_file():
  print("**ERROR: config file '", config_file, "' does not exist, exiting")
  sys.exit(0)

#
# setup base URL to web service:
#
configur = ConfigParser()
configur.read(config_file)
baseurl = configur.get('client', 'webservice')

# print(baseurl)

#
# main processing loop:
#
cmd = prompt()

while cmd != 0:
  #
  if cmd == 1:
    stats(baseurl)
  elif cmd == 2:
    users(baseurl)
  elif cmd == 3:
    assets(baseurl)
  elif cmd == 4:
    download(baseurl, display=False)
  elif cmd == 5:
    download(baseurl, display=True)
  elif cmd == 6:
    list_bucket(baseurl)
  else:
    print("** Unknown command, try again...")
  #
  cmd = prompt()

#
# done
#
print()
print('** done **')
