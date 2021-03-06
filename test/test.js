/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Philippe Leefsma 2015 - ADN/Developer Technical Services
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////
var should = require('chai').should(),
  Lmv = require('../view-and-data'),
  path = require('path');

//only fill up requested fields, other fields are defaulted
var config = {

  // change that bucket name
  defaultBucketKey: 'leefsmp-forge-transient',

  // change that to your own keys or system variables
  credentials: {

    clientId: process.env.FORGE_CLIENTID,
    clientSecret: process.env.FORGE_CLIENTSECRET
  },

  // see: https://developer.autodesk.com/en/docs/oauth/v2/overview/scopes
  scope: [
    'data:read',
    'data:create',
    'data:write',
    'bucket:read',
    'bucket:create'
  ]
}

describe('# View & Data Tests: ', function() {

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  it('Get token', function(done) {

    console.log('\n\n----------- TEST 1 -----------')

    //set a 15'' timeout
    this.timeout(15 * 1000);

    var lmv = new Lmv(config);

    lmv.getToken().then(function(response) {

      console.log('Token Response:')
      console.log(response)

      done();

    }, function(error) {

      done(error);
    });

  });

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  it('Get bucket (create if does not exist)', function(done) {

    console.log('\n\n----------- TEST 2 -----------')

    this.timeout(15 * 1000);

    var lmv = new Lmv(config);

    function onError(error) {

      console.log(error)
      done(error);
    }

    function onInitialized(response) {

      var createIfNotExists = true;

      var bucketCreationData = {
        bucketKey: config.defaultBucketKey,
        servicesAllowed: [],
        policy: "transient"
      };

      lmv.getBucket(config.defaultBucketKey,
        createIfNotExists,
        bucketCreationData).then(
        onBucketCreated,
        onError);
    }

    function onBucketCreated(response) {

      console.log(response)
      done();
    }

    lmv.initialize().then(onInitialized, onError);
  });

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  var urn = '';

  it('Full workflow (bucket/upload/registration/translation/thumbnail)', function(done) {

    console.log('\n\n----------- TEST 3 -----------')

    this.timeout(5 * 60 * 1000); //5 mins timeout

    var lmv = new Lmv(config);

    function onError(error) {

      console.log(error)
      done(error);
    }

    function onInitialized(response) {

      var createIfNotExists = true;

      var bucketCreationData = {
        bucketKey: config.defaultBucketKey,
        servicesAllowed: [],
        policy: "transient"
      };

      lmv.getBucket(config.defaultBucketKey,
        createIfNotExists,
        bucketCreationData).then(
          onBucketCreated,
          onError);
    }

    function onBucketCreated(response) {

      //lmv.upload(
      //  path.join(__dirname, './data/test.dwf'),
      //  config.defaultBucketKey,
      //  'test.dwf').then(onUploadCompleted, onError);

      lmv.resumableUpload(
        path.join(__dirname, './data/test.dwf'),
        config.defaultBucketKey,
        'test.dwf').then(onResumableUploadCompleted, onError);
    }

    function onUploadCompleted(response) {

      var fileId = response.objects[0].id;

      urn = lmv.toBase64(fileId);

      lmv.register(urn, true).then(onRegister, onError);
    }

    function onResumableUploadCompleted(response) {

      response.forEach(function(result){

        console.log(result.objects);
      });

      var fileId = response[0].objects[0].id;

      urn = lmv.toBase64(fileId);

      lmv.register(urn, true).then(onRegister, onError);
    }

    function onRegister(response) {

      if (response.Result === "Success") {

        console.log('Translating file...');

        lmv.checkTranslationStatus(
          urn, 1000 * 60 * 5, 1000 * 10,
          progressCallback).then(
            onTranslationCompleted,
            onError);
      }
      else {
        done(response);
      }
    }

    function progressCallback(progress) {

      console.log(progress);
    }

    function onTranslationCompleted(response) {

      console.log('URN: ' + response.urn);

      lmv.getThumbnail(urn).then(onThumbnail, onError);
    }

    function onThumbnail(response) {

      console.log('Thumbnail Size: ' + response.length);
      done();
    }

    //start the test
    lmv.initialize().then(onInitialized, onError);
  });

  ///////////////////////////////////////////////////////////////////
  //
  //
  ///////////////////////////////////////////////////////////////////
  it('Download Model Data', function(done) {

    console.log('\n\n----------- TEST 4 -----------')

    this.timeout(5 * 60 * 1000); //5 mins timeout

    var lmv = new Lmv(config);

    function onError(error) {

      console.log(error)
      done(error);
    }

    function onInitialized(response) {

      if(!urn.length) {

        done('Invalid translation, abort download...');
        return;
      }

      lmv.download(urn, './test/data/download').then(
        onDataDownloaded,
        onError
      );
    }

    function onDataDownloaded(items) {

      console.log('Model downloaded successfully');

      var path3d = items.filter(function(item){
        return item.type === '3d';
      });

      console.log('3D Viewable path:');
      console.log(path3d);

      var path2d = items.filter(function(item){
        return item.type === '2d';
      });

      console.log('2D Viewable path:');
      console.log(path2d);

      done();
    }

    //start the test
    lmv.initialize().then(onInitialized, onError);
  });
});