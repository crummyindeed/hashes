const crypto = require('crypto');
const CrummyDB = require('crummydb');
//const level = require('level');

var HaySeed = function (settings) {
  if (typeof settings.storage_dir == "undefined") {
    throw "Storage DIR is required!";
  }
  this.Storage = new CrummyDB(settings.storage_dir);

  if (typeof settings.stream == "undefined") {
    throw "please pass a NetShout compatible Stream";
  } else {
    this.Stream = settings.stream;
  }

  this.peerRequests = {};
  this.myRequests = {};

  var self = this;

  this.Stream.subscribe('request', async function (bundle, context) {
    var bundle = JSON.parse(bundle);
    var response = {
      id: bundle.id,
      content: {}
    };
    //for every digest I have, fulfill it and remove it from the req
    var requests = bundle.req;
    for (let i in requests) {
      var digest = requests[i];
      var content = await self.getContent(digest);
      if (content !== false) {
        response.content[digest] = content;
        delete bundle.req[digest];
      }
    }
    //send what I have back and the rest on.
    if ((Object.keys(response.content)).length > 0) {
      context.reply("response", JSON.stringify(response));
    }
    if (bundle.req.length > 0) {
      if (typeof self.peerRequests[bundle.id] == 'undefined') {
        self.peerRequests[bundle.id] = [];
      }
      self.peerRequests[bundle.id].push(context);
      context.relay("request", JSON.stringify(bundle));
    }
  });

  this.Stream.subscribe('response', function (bundle) {
    var decoded = JSON.parse(bundle);
    if (typeof self.peerRequests[decoded.id] != "undefined") {
      for (let i in self.peerRequests[decoded.id]) {
        self.peerRequests[decoded.id][i].reply("response", bundle);
      }
    }
    if (typeof self.myRequests[decoded.id] != "undefined") {
      var digests = Object.keys(decoded.content);
      for (let i in digests) {
        var digest = digests[i];
        var existing = self.myRequests[decoded.id].req.indexOf(digest);
        if (existing > -1) {
          var content = decoded.content[digest];
          var hash = crypto.createHash('sha256');
          hash.update(content);
          var check = hash.digest('hex');
          if (check === digest) {
            self.myRequests[decoded.id].handler(digest, content);
            self.myRequests[decoded.id].req.splice(existing, 1);
          }
        }
      }
      if (self.myRequests[decoded.id].req.length === 0) {
        delete self.myRequests[decoded.id];
      }
    }
  });
}

HaySeed.prototype.init = async function () {
  await this.Storage.init();
}

HaySeed.prototype.requestContent = function (digests, responseHandler) {
  if (!(digests instanceof Array)) {
    throw "requestContent requires an array of requested digests";
  }
  //create a unique id - this will work okay
  var hash = crypto.createHash('sha256');
  hash.update(digests.join(''));
  var bundle_id = hash.digest('hex');

  var bundle = JSON.stringify({
    "id": bundle_id,
    "req": digests
  });

  this.myRequests[bundle_id] = {
    req: digests,
    handler: responseHandler
  };

  this.Stream.shout('request', bundle);
}

HaySeed.prototype.createContent = async function (text) {
  if (typeof text != "string") {
    throw "Sorry kid, string content only for now.";
  }
  var hash = crypto.createHash('sha256');
  hash.update(text);
  var digest = hash.digest('hex');
  await this.Storage.put(digest, text);
  return digest;
}

HaySeed.prototype.getContent = async function (digest) {
  var content = await this.Storage.get(digest);
  return content;
}

module.exports = HaySeed;