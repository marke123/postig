// Run this function after the page has loaded
$(function () {
  // hides user & pword until client is loaded
  var printer = require('printer');
  var download = require('image-downloader');
  var WebScale = require('./src/webscale.js');
  var on = true;
  var off = false;
  $("#green").hide();
  $("#left").hide();
  $("#right").hide();

  $.getScript('./src/stamps.js', function() {
      Stamps = new Stamps();
      var t01 = performance.now();
      Stamps.connect({isDev: true}).then(() => {
        var t02 = performance.now();
        console.log("client is ready to load info");
        $("#green").show();
        console.log("connect successful; time spent: " + (t02-t01));
      }, (error) => {
        console.log("an error occured.");
        console.log("error: " + error);
      });
  });

  // login button
  // validates credentials and transitions if successful
  $("#login-btn").on('click', function() {
    fadeLogin(on);
    console.log("stamps client: " + Stamps.client);
    loadSpinner(on);
    console.log("name: " + $("#user_name").val());
    console.log("word: " + $("#pass_word").val());
    var authCreds = {
      id: "b05c1b27-349a-4387-8ed5-f3f957d6536d",
      username: $("#user_name").val(),
      password: $("#pass_word").val(),
    };

    Stamps.auth(authCreds, true).then(() => {
      // auth successful
      // present transition into main page
      console.log("authentication success!");
      if(Stamps.token) {
        console.log("auth token is active");
        console.log("token: " + Stamps.token);
        setTimeout(function () {
          transitionToMainScreen();
        }, 1500);
        setTimeout(function() {
          switchLoginDivsForMainDivs();
          loadSpinner(off);
        }, 5200);
      };
    }, (error) => {
      // auth rejected
      // remain in login page until log successful
      console.log("authentication error.");
      loadSpinner(off);
      fadeLogin(off);
      console.log(error);
    });
  });

  $("#textarea1").on('blur', function() {
    verifyAddress($("#textarea1").val(), "send").then((verified) => {
      console.log("Yay, it worked!");
      console.log("contents of Stamps.to: ");
      for (var i in Stamps.from) {
        console.log(i + ": " + Stamps.from[i]);
      }
      console.log("Stamps.rate['FromZIPCode']: " + Stamps.rate["FromZIPCode"]);
    }, (unverified) => {
      console.log("Boo, it failed.");
    });
  });

  $("#textarea2").on('blur', function() {
    console.log("Sender area is being blurred");
    console.log("Sender value: " + typeof($("#textarea1").val()));
    // determine whether or not address was verified, i.e. parsed & cleansed
    verifyAddress($("#textarea2").val(), "recieve").then((verified) => {
      console.log("Yay, it worked!");
      console.log("contents of Stamps.to: ");
      for (var i in Stamps.to) {
        console.log(i + ": " + Stamps.to[i]);
      }
      console.log("Stamps.rate['ToZIPCode']: " + Stamps.rate["ToZIPCode"]);
    }, (unverified) => {
      console.log("Boo, it failed.");
    });
  });

  $("#lb").on('blur', function() {
    console.log("Pounds value: " + $("#lb").val());
    Stamps.rate['WeightLb'] = parseFloat($("#lb").val());
  });

  $("#oz").on('blur', function() {
    console.log("Ounce value: " + $("#oz").val());
    Stamps.rate['WeightOz'] = parseFloat($("#oz").val());
    for (var i in Stamps.rate) {
      console.log(i + ": " + Stamps.rate[i]);
    }
  });

  $("#postig-btn").on('click', function() {
    Stamps.request('CreateIndicium', {
      'Rate': Stamps.rate,
      'From': Stamps.from,
      'To': Stamps.to,
      'SampleOnly': false,
      'ImageType': 'Png',
    }, true).then((label) => {
      download.image({url: label.URL, dest: './img/live.png'}).then(({filename, image}) => {
        console.log("File saved to: " + filename);
        console.log("Printting file.");
        printer.printFile({filename: filename});
      });
      console.log("actual label: " + label.URL);
    }, (error) => {
      console.log("Error occured.");
      console.log(error);
    });
  });

  $("#sample-btn").on('click', function() {
    Stamps.request('CreateIndicium', {
      'Rate': Stamps.rate,
      'From': Stamps.from,
      'To': Stamps.to,
      'SampleOnly': true,
      'ImageType': 'Png',
    }, true).then((label) => {
      download.image({url: label.URL, dest: './img/sample.png'}).then(({filename, image}) => {
        console.log("File saved to: " + filename);
        console.log("Printting file.");
        printer.printFile({filename: filename});
      });
    }, (error) => {
      console.log("Error occured.");
      console.log(error);
    });
  });

  // cancel button
  // clears input data, sets to null, and unblurs fields on screen
  $("#cancel-btn").on('click', function() {
    $("#user_name").val(null).blur();
    $("#pass_word").val(null).blur();
  });
  // return true if verify/cleanse was successful, else false if error
  function verifyAddress(address, type) {
    var receiver = cleanAddress(address);
    return new Promise((resolve, reject) => {
      Stamps.request('CleanseAddress', {'Address': receiver}).then((result) => {
        console.log("cleanse success!");
        console.log("removing nulled values in result.Address");
        for (var i in result.Address) {
          if (result.Address[i] === null || result.Address[i] === 'undefined') {
            delete result.Address[i];
          }
        }
        //standardizing address casing -- doesn't work; it errors when being matched with cleansed address
        // console.log("modify case of address: ");
        // for (var i in result.Address) {
        //   if (i === "State") {
        //     continue;
        //   }
        //   result.Address[i] = toTitleCase(result.Address[i]);
        // }
        if (type === "send") {
          Stamps.from = result.Address;
          Stamps.rate["FromZIPCode"] = Stamps.from["ZIPCode"];
        }
        else {
          Stamps.to = result.Address;
          Stamps.rate["ToZIPCode"] = Stamps.to["ZIPCode"];
        }

        resolve(true);
      }, (error) => {
        console.log("cleanse failed.");
        reject(false);
      });
    });
  };

  function cleanAddress(address) {
    var splitAddressRaw = address.split("\n");
    var splitAddressRawLength = splitAddressRaw.length;
    var splitAddressCleaned = [];
    // come back to this when ready to cleanseaddress using api -- DONE
    var cleanedAddress = {};
    for (var i = 0; i < splitAddressRawLength; i++) {
      // if the loop has reached the city state zip element
      if (i === (splitAddressRawLength - 1)) {
        var cityStateZipRaw = splitAddressRaw[i].split(" ");
        var cityStateZipClean = [];
        cityStateZipClean.push(cityStateZipRaw[cityStateZipRaw.length - 1]);
        cityStateZipRaw.pop(); // zip popped; city state remain
        cityStateZipClean.push(cityStateZipRaw[cityStateZipRaw.length - 1]);
        cityStateZipRaw.pop(); // state popped; city remain
        // if the array is more than one (meaning a city with a space in name)
        // join the names and push it, else push normally
        if (cityStateZipRaw.length > 1) {
          cityStateZipClean.push(cityStateZipRaw.join(" "));
        } else {
          cityStateZipClean.push(cityStateZipRaw[cityStateZipRaw.length - 1]);
        }
        splitAddressCleaned.push(cityStateZipClean.reverse());
      } else {
        splitAddressCleaned.push(splitAddressRaw[i]);
      };
    };
    cleanedAddress["FullName"] = splitAddressCleaned[0];
    if (splitAddressCleaned.length === 4) {
      cleanedAddress["Company"] = splitAddressCleaned[1];
      cleanedAddress["Address1"] = splitAddressCleaned[2];
      cleanedAddress["City"] = splitAddressCleaned[3][0];
      cleanedAddress["State"] = splitAddressCleaned[3][1];
      cleanedAddress["ZIPCode"] = splitAddressCleaned[3][2];
    } else {
      cleanedAddress["Address1"] = splitAddressCleaned[1];
      cleanedAddress["City"] = splitAddressCleaned[2][0];
      cleanedAddress["State"] = splitAddressCleaned[2][1];
      cleanedAddress["ZIPCode"] = splitAddressCleaned[2][2];
    }
    // console.log("Sender value split and cleaned: " + splitAddressCleaned);
    // console.log("splitAddressCleaned in dict: ");
    // for (var i in cleanedAddress) {
    //   console.log( i + ": " + cleanedAddress[i]);
    // }
    return cleanedAddress;
  };

  function transitionToMainScreen() {
    fadeLoginCredentials();
  };

  function fadeLoginCredentials() {
    $("#red").removeClass("fadeIn");
    $("#red").css("-webkit-animation-delay", "0s");
    $("#red").addClass("fadeOut");
    setTimeout(fadePostigTitle, 1300);
  };

  function fadePostigTitle() {
    $("#post").removeClass("fadeInUp");
    $("#post").addClass("fadeOutUp");
  };

  function switchLoginDivsForMainDivs() {
    $("#orange").hide();
    $("#green").hide();
    $("#left").show();
    $("#right").show();
  };

  function fadeLogin(value) {
    if (value) {
      $("#orange").fadeTo(500, 0.55);
      $("#green").fadeTo(500,0.55);
    } else {
      // come back to this and figure out a better solution to transition/load
      $("#orange").fadeTo(1,1);
      $("#green").fadeTo(1,1);
      // fadeIn() only works if divs are completely hidden
      // $("#orange").fadeIn();
      // $("#green").fadeIn();
    };
  };

  function loadSpinner(value) {
    if (value) {
      $("#preload").addClass("active"); //
      $("#loader").css("pointer-events", "auto"); //
      $("#spinner").css("visibility", "visible"); //
    } else {
      $("#preload").removeClass("active"); //
      $("#loader").css("pointer-events", "none"); //
      $("#spinner").css("visibility", "hidden"); //
    };
  };

  // courtesy of:
  // - https://stackoverflow.com/questions/4878756/how-to-capitalize-first-letter-of-each-word-like-a-2-word-city
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  // Courtesy of:
  // - https://github.com/Aldaviva/WebScale
  // license:
  // - https://github.com/Aldaviva/webscale/blob/master/LICENSE
  var webScale = new WebScale();

  webScale.on('change:weight', function(ounces) {
    var pounds = roundTowardsZero(ounces/16);
    var remainderOunces = (Math.round(ounces % 16 * 10)/10).toFixed(1);
    $("#lb").val(pounds);
    $("#oz").val(remainderOunces);
    console.log(pounds + " lbs. " + remainderOunces + " oz.");
    //$('#temp').text(pounds + " lbs. " + remainderOunces + " oz.");
  });

  webScale.on('error', function(error) {
    console.error("Oh noes.", error);
  });

  webScale.on('connected', function() {
    $("svg").css("fill-opacity", "1");
    console.log("Scale online.");
  });

  webScale.once('disconnected', function() {
    console.log("Scale disconnected. Try running as root.");
    webScale.on('disconnected', function() {
      $("svg").css("fill-opacity", "0.25");
      //console.log("Scale disconnected. Reconnecting...");
    });
  });

  function roundTowardsZero(number) {
    if (number >= 0) {
      return Math.floor(number);
    } else {
      return Math.ceil(number);
    }
  };

});
