const rimraf = require('rimraf');
const expect = require("chai").expect;
const NetShout = require('@the3rdc/netshout');
const crypto = require('crypto');

const HaySeed = require('.');

rimraf.sync("./testAlice");
rimraf.sync("./testBobby");
rimraf.sync("./testCarlo");

var correct_content = "this is only a test";
var correct_contentB = "this is a much longer test. In fact, it may be a necessary to use some auto generated text to fill it out to appropriate size. Let's go to our good old friend lipsum, the lorem ipsum generator: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas tortor purus, vehicula eget ex ut, eleifend euismod ante. Proin facilisis est nec nisl fringilla, ut bibendum quam euismod. Aenean enim lacus, vestibulum ut porttitor a, mollis ut ante. Aliquam ac arcu venenatis tortor pellentesque suscipit et id nulla. Vestibulum mattis ex in velit volutpat efficitur. Duis elementum risus ac eros scelerisque lacinia. Aenean venenatis arcu diam, eget ultrices mauris aliquet id.\nMaecenas sit amet sem tempor purus auctor pulvinar. Curabitur convallis ut justo et tempor. In nibh tellus, viverra molestie felis sed, sollicitudin congue quam. Etiam convallis ipsum nec felis egestas ornare. Sed laoreet lectus vitae dolor lobortis facilisis. Aliquam erat volutpat. Nulla venenatis, libero sit amet pretium ornare, turpis quam lobortis risus, a luctus turpis sapien eget nisi. Nunc cursus libero vitae velit vulputate vestibulum. Pellentesque massa nulla, varius in tortor sit amet, viverra pharetra est. Fusce nec lectus nunc. Cras finibus, ligula et mattis finibus, leo est commodo tortor, a scelerisque ex purus ac sem. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Integer facilisis iaculis est et tempor. Phasellus accumsan quam at iaculis convallis.\nNam venenatis magna condimentum, pharetra nisi id, placerat dolor. Aliquam eget fermentum sapien. Nam nisi arcu, vestibulum sit amet tincidunt quis, aliquet at arcu. Cras sit amet tristique eros. Praesent tincidunt ligula nec nunc ornare, quis accumsan lorem eleifend. Nulla congue posuere nibh, sit amet dapibus ex dictum nec. Donec mauris metus, viverra nec sem eget, rhoncus sollicitudin neque. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vitae erat lorem. Vestibulum hendrerit ipsum orci, eu blandit velit suscipit eget. Vestibulum nec laoreet metus.\nQuisque quis ultrices ante. Morbi at consequat mi. Mauris faucibus sagittis tortor, vel elementum eros placerat vitae. Cras vestibulum sit amet neque eu lobortis. Aenean enim magna, dignissim eget iaculis nec, cursus et justo. In faucibus ipsum eu turpis elementum scelerisque. Nam semper neque vel imperdiet ultricies. Praesent eget erat quis velit fermentum tincidunt a non arcu. Ut viverra, tortor a tempus luctus, neque dui pretium sem, sit amet convallis nulla neque sed ipsum. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Fusce bibendum lectus eget mi cursus accumsan. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eget velit ornare, auctor libero id, placerat mi. Nam neque nisi, sodales sed neque eu, vulputate consequat nisi.\nUt auctor, mi nec venenatis posuere, libero nibh laoreet est, eleifend gravida purus nisi auctor ipsum. Fusce pretium, magna quis hendrerit venenatis, ipsum nisl tincidunt ipsum, vehicula venenatis ligula tellus maximus massa. Praesent fringilla viverra justo ut tincidunt. Maecenas sed dignissim diam. Nullam ullamcorper, diam non egestas viverra, arcu sapien pulvinar leo, ornare interdum nulla erat ac eros. Pellentesque sodales quam nibh, eget pretium nibh posuere a. Duis at porttitor urna. Curabitur vehicula porta lectus, sed ullamcorper massa vestibulum a. Ut rhoncus metus enim, nec facilisis lorem consequat a. Ut diam augue, pellentesque a augue vel, condimentum efficitur quam. Suspendisse lacus nunc, ultrices id lectus id, accumsan auctor nulla. Etiam id consequat ligula, non accumsan mauris. Maecenas erat dui, suscipit ac aliquam at, tristique vel libero. Proin in malesuada velit, vel commodo ligula. Vestibulum in rutrum neque. Sed id tortor feugiat nunc fermentum viverra et ac risus.";

var hash1 = crypto.createHash('sha256');
var hash2 = crypto.createHash('sha256');
hash1.update(correct_content);
hash2.update(correct_contentB);
var correct_digest = hash1.digest('hex');
var correct_digestB = hash2.digest('hex');

var stream1 = new NetShout();
var stream2 = new NetShout();
var stream3 = new NetShout();

describe('One Massive Test!', function () {
  it('should all work', function (done) {
    this.timeout(2000);
    //yes... yes I know this is awful...
    stream2.startHosting('1234', function () {
      stream3.startHosting('1337', function () {
        stream1.connectTo('127.0.0.1', '1234', function () {
          stream2.connectTo('127.0.0.1', '1337', async function () {
            var Alice = new HaySeed({
              stream: stream1,
              storage_dir: './testAlice',
            });
            await Alice.init();
            var Bobby = new HaySeed({
              stream: stream2,
              storage_dir: './testBobby',
            });
            await Bobby.init();
            var Carlo = new HaySeed({
              stream: stream3,
              storage_dir: './testCarlo',
            });
            await Carlo.init();

            var dig1 = await Bobby.createContent(correct_content);
            var dig2 = await Carlo.createContent(correct_contentB);

            expect(dig1).to.equal(correct_digest);
            expect(dig2).to.equal(correct_digestB);

            var waiting = 0;

            Alice.requestContent([correct_digest, correct_digestB], function (digest, content) {
              if (digest == correct_digest) {
                expect(content).to.equal(correct_content);
                waiting++;
              }
              if (digest == correct_digestB) {
                expect(content).to.equal(correct_contentB);
                waiting++;
              }
            });

            setTimeout(function () {
              stream1.shutDown();
              stream2.shutDown();
              stream3.shutDown();
              if (waiting == 2) {
                done();
              } else {
                done(new Error("Didn't get resolution in 1.5 seconds"));
              }
            }, 1500);

          });
        });
      });
    });
  });
});