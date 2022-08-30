// LOADER SPIN http://localhost/project1

$(window).on("load", function () {
  if ($("#preloader").length) {
    $("#preloader")
      .delay(500)
      .fadeOut("slow", function () {
        $(this).remove();
      });
  }
});

let dropdown = $("#countriesList");
dropdown.empty();

// SET AND DISPLAY MAPS AND LAYERS

const atlasLayer = L.tileLayer.provider("CartoDB.Voyager");
const satelliteLayer = L.tileLayer.provider("USGS.USImagery");

const cityLayer = L.markerClusterGroup({
  iconCreateFunction: function (event) {
    return (
      (icon = '<span class="fas fa-city"></span>'),
      new L.DivIcon({
        html: `<div><span>${icon}<br>${event.getChildCount()}</span></div>`,
        className: "marker-cluster marker-cluster-small marker-cluster-city",
        iconSize: new L.Point(40, 40)
      })
    );
  },
});

const quakeLayer = L.markerClusterGroup({
  iconCreateFunction: function (event) {
    return (
      (icon = '<span class="fas fa-exclamation-triangle"></span>'),
      new L.DivIcon({
        html: `<div><span>${icon}<br>${event.getChildCount()}</span></div>`,
        className: "marker-cluster marker-cluster-small marker-cluster-quake",
        iconSize: new L.Point(40, 40)
      })
    );
  },
});

const wikiLayer = L.markerClusterGroup({
  iconCreateFunction: function (event) {
    return (
      (icon = '<span class="fab fa-wikipedia-w"></span>'),
      new L.DivIcon({
        html: `<div><span>${icon}<br>${event.getChildCount()}</span></div>`,
        className: "marker-cluster marker-cluster-small marker-cluster-wiki",
        iconSize: new L.Point(40, 40)
      })
    );
  },
});

const map = L.map("map", {
  layers: [atlasLayer, satelliteLayer],
}); // .setView([0, 0], 3) -> add if needed

const baseMaps = {
  Atlas: atlasLayer,
  Satellite: satelliteLayer
};

const overlayMaps = {
  Cities: cityLayer,
  Earthquakes: quakeLayer,
  Wikipedia: wikiLayer,
};

L.control.layers(baseMaps, overlayMaps).addTo(map);
L.control.scale().addTo(map);

L.easyButton(
  `<i class="fas fa-info-circle fa-lg" style="color: blue;" title="Country Information"></i>`,
  function () {
    $("#information").modal("show");
  }, {
    position: "topleft",
  }
).addTo(map);

const resetBoundaryButton = L.easyButton({
  id: "resetBoundaryButton",
  states: [{
    stateName: "buttonOff",
    title: "Reset Zoom to Current Location",
    icon: "fa-search-location",
    onClick: function (event, bounds) {
      bounds.fitBounds(currentCountryBoundary.getBounds())
    }
  }]
});

// GLOBAL VARIABLES TO STORE COUNTRY DEPENDENCIES

let currentCountryCode = "";
let currentCountryName = "";
let currentCountryBoundary = new L.geoJson();
let initialCountry = "";

function setListCountry() {
  $.ajax({
    type: "POST",
    url: "php/getCountry.php",
    dataType: "json",
    success: function (result) {
      let countries = result;
      for (let country of countries) {
        dropdown.append(`<option value="${country[1]}">${country[0]}</option>`);
      };
      getCurrentLocation();
    },
    error: function (error) {
      console.log("Error: could not get country list!");
      console.log(error.responseText);
    },
  });
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      $.ajax({
        url: "php/getCountryCode.php",
        type: "POST",
        dataType: "json",
        data: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        success: function (result) {
          currentCountryCode = result.data.countryCode;
          initialCountry = result.data.countryCode;
          dropdown.val(currentCountryCode);
          focusOnCountry();
        },
        error: function (error) {
          console.log("Error: could not get country code");
          console.log(error.responseText);
        },
      });
    });
  } else {
    alert("Position unavailable!");
  }
}

function focusOnCountry() {
  $.ajax({
    url: "php/getBorders.php",
    type: "POST",
    dataType: "json",
    data: {
      countryCode: currentCountryCode,
    },
    success: function (result) {
      addBorders(result);
      getCountryInfo(currentCountryCode);
      getCovidInfo(currentCountryCode);
    },
    error: function (error) {
      console.log("Error: could not get country boundaries");
      console.log(error.responseText);
    }
  })
}

function addBorders(borders) {
  currentCountryBoundary.removeFrom(map);
  currentCountryBoundary = L.geoJson(borders);
  currentCountryBoundary.setStyle({
      fillColor: "#fff",
      weight: 1.5,
      color: "red",
    }),

    currentCountryBoundary.addTo(map);
  map.fitBounds(currentCountryBoundary.getBounds());
  getMapInfo();
}

//------------------------------------------------------------- POPULATE MODAL FUNCTIONS -----------------------------------------------------------

function getCountryInfo(currentCountryCode) {
  $("#infoTable").html("");
  $.ajax({
    url: "php/getCountryInfo.php",
    type: "POST",
    dataType: "json",
    data: {
      country: currentCountryCode,
    },
    success: function (result) {
      if (result.data.length == 0) {
        $("#infoTable").html(
          "<h5>No Informations Available at the moment! Sorry for the trouble.</h5>"
        );
        return;
      } else {
        const info = result.data[0];
        currentCountryName = info.countryName;
        $("#countryName").html(currentCountryName);
        $("#infoTable").html(`
        <tr>
          <td>Capital:</td>
          <td id="capitalName">${info.capital}</td>
        </tr>
        <tr>
          <td>Currency:</td>
          <td id="currency">${info.currencyCode}</td>
        </tr>
        <tr>
          <td>Population:</td>
          <td id="population">${numberWithPoint(info.population)}</td>
        </tr>
        <tr>
          <td>Area in Km:</td>
          <td id="area">${info.areaInSqKm}</td>
        </tr>
       `);
        resetInfoButton();
        getTypedButton();
        getCountryPictures(currentCountryName);
        getForecast(info.capital);
      }
    },
    error: function (error) {
      console.log("Error: could not get Country Information");
      console.log(error.responseText);
    }
  });
}

function getCovidInfo(currentCountryCode) {
  $.ajax({
    url: "php/getCovidInfo.php",
    type: "POST",
    dataType: "json",
    data: {
      countryCode: currentCountryCode,
    },
    success: function (result) {
      if (!result.data) {
        $("#covidInfo").html(
          "<h5>No Covid Informations Available at the moment! Sorry for the trouble.</h5>"
        );
        return;
      } else {
        const covid = result.data;
        $("#covidInfo").html(`
        <tr>
          <td>New Cases</td>
          <td id="newCases">${numberWithPoint(covid.todayCases)}</td>
        </tr>
        <tr>
          <td>New Deaths</td>
          <td id="newDeath">${numberWithPoint(covid.todayDeaths)}</td>
        </tr>
        <tr>
          <td>Newly Recovered</td>
          <td id="newRecovered">${numberWithPoint(covid.todayRecovered)}</td>
        </tr>
        <tr>
          <td>Total Cases</td>
          <td id="totalCases">${numberWithPoint(covid.cases)}</td>
        </tr>
        <tr>
          <td>Total Deaths</td>
          <td id="totalDeaths">${numberWithPoint(covid.deaths)}</td>
        </tr>
        <tr>
          <td>Total Recovered</td>
          <td id="totalRecovered">${numberWithPoint(covid.recovered)}</td>
        </tr>
       `)
      }
    },
    error: function (error) {
      console.log("Error: could not get Covid Information");
      console.log(error.responseText);
    }
  })
}

function getCountryPictures(currentCountryName) {
  $("#imagesBody").html("");
  $.ajax({
    url: "php/getImages.php",
    type: "POST",
    dataType: "json",
    data: {
      countryName: currentCountryName,
    },
    success: function (result) {
      const images = result.data.hits;
      if (images.length == 0) {
        $("#imagesBody").html(
          "<h5>No Images Found! Sorry for the trouble.</h5>"
        );
        return;
      } else {
        for (let i = 0; i < 5; i++) {
          $("#imagesBody").append(
            "<img class='countryImage' src=" +
            images[i].webformatURL +
            " alt='Country Image'>"
          );
        }
      }
    }
  })
}

function getForecast(capital) {
  $.ajax({
    url: "php/getForecast.php",
    type: "POST",
    dataType: "json",
    data: {
      city: capital
    },
    success: function (result) {
      getWeather(capital, result.data[0]);
    },
    error: function (error) {
      console.log("Error Retrieving Current Weather from Open Weather");
      console.log(error.responseText)
    }
  })
}

function getWeather(capital, location) {
  $("#dailyForecast").html("");
  $.ajax({
    url: "php/getWeather.php",
    type: "POST",
    dataType: "json",
    data: {
      lat: location.lat,
      lng: location.lon
    },
    success: function (result) {
      let iconUrl = "https://openweathermap.org/img/w/";
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      if (result.data.daily.length == 0) {
        $("#modalForecast").html(
          "<h5>No Weather Forecast Available!, Sorry for the trouble.</h5>"
        );
        return;
      } else {
        for (let i = 0; i < 5; i++) {
          const d = result.data.daily[i];
          const day = days[new Date(d.dt * 1000).getDay()];
          $("#dailyForecast").append(
            `
            <tr>
              <td>
                ${day}
              </td>
              <td>
                ${parseInt(d["temp"]["max"])}°/ ${parseInt(d["temp"]["min"])}°
              </td>
              <td>
                ${d.weather[0].description}
              </td>
              <td>
                <img src="${iconUrl}${d.weather[0].icon}.png">
              </td>
            </tr>
            `
          );
        }
      }
    },
    error: function (error) {
      console.log("Error Retrieving Current Weather from Open Weather");
      console.log(error.responseText)
    }
  })
}

//------------------------------------------------------------- GET MARKERS INFORMATIONS AND LOCATIONS -----------------------------------------------------------

function getCityInfo() {
  $.ajax({
    url: "php/getCities.php",
    type: "POST",
    dataType: "json",
    data: {
      north: currentCountryBoundary.getBounds()._northEast.lat,
      south: currentCountryBoundary.getBounds()._southWest.lat,
      east: currentCountryBoundary.getBounds()._northEast.lng,
      west: currentCountryBoundary.getBounds()._southWest.lng,
    },
    success: function (result) {
      if (result.data.geonames.length == 0) {
        alert("No city locations available at the moment, try again later.");
        return;
      } else {
        const location = result.data.geonames;
        location.forEach(place => {
          const marker = createCityMarker(place);
          cityLayer.addLayer(marker);
        });
        cityLayer.addTo(map);
      }
    },
    error: function (error) {
      console.log("Error loading city information from Geonames"),
        console.log(error.responseText)
    }
  })
}

function getWikiInfo() {
  $.ajax({
    url: "php/getLinks.php",
    type: "POST",
    dataType: "json",
    data: {
      north: currentCountryBoundary.getBounds()._northEast.lat,
      south: currentCountryBoundary.getBounds()._southWest.lat,
      east: currentCountryBoundary.getBounds()._northEast.lng,
      west: currentCountryBoundary.getBounds()._southWest.lng,
    },
    success: function (result) {
      if (result.data.geonames.length == 0) {
        alert("No Wikipedia location available at the moment, try again later.");
        return;
      } else {
        const location = result.data.geonames;
        location.forEach(place => {
          const marker = createWikiMarker(place);
          wikiLayer.addLayer(marker);
        });
        wikiLayer.addTo(map);
      }
    },
    error: function (error) {
      console.log("Error loading wikipedia information from Geonames"),
        console.log(error.responseText);
    }
  })
}

function getQuakeInfo() {
  $.ajax({
    url: "php/getEarthquake.php",
    type: "POST",
    dataType: "json",
    data: {
      north: currentCountryBoundary.getBounds()._northEast.lat,
      south: currentCountryBoundary.getBounds()._southWest.lat,
      east: currentCountryBoundary.getBounds()._northEast.lng,
      west: currentCountryBoundary.getBounds()._southWest.lng,
    },
    success: function (result) {
      if (result.data.earthquakes.length == 0) {
        alert("No Earthquake location available at the moment, try again later.");
        return;
      } else {
        const location = result.data.earthquakes;
        location.forEach(place => {
          const marker = createQuakeMarker(place);
          quakeLayer.addLayer(marker);
        });
        quakeLayer.addTo(map);
      }
    },
    error: function (error) {
      console.log("Error loading wikipedia information from Geonames"),
        console.log(error.responseText);
    }
  })
}

// ----------------------------------------------------------------- CREATE MARKERS FUNCTIONS ----------------------------------------------------------------------------

function createCityMarker(city) {
  const popup = `<b>${city.name}</b><br>Population: ${city.population.toLocaleString()}`;
  const marker = L.ExtraMarkers.icon({
    icon: "fa-city",
    markerColor: "blue",
    shape: "circle",
    prefix: "fa"
  });
  return L.marker(L.latLng(city.lat, city.lng), {
    icon: marker
  }).bindPopup(popup)
}

function createWikiMarker(wiki) {
  const url = `http://${wiki.wikipediaUrl}`;
  const popup = `<a href="${url}" target="_blank">${wiki.title}</a>`;
  const marker = L.ExtraMarkers.icon({
    icon: "fa-wikipedia-w",
    markerColor: "pink",
    shape: "square",
    prefix: "fab"
  });
  return L.marker(L.latLng(wiki.lat, wiki.lng), {
    icon: marker
  }).bindPopup(popup)
}

function createQuakeMarker(quake) {
  const time = new Date(quake.datetime)
  const popup = `<b>Earthquake</b><br>\nMagnitude: ${quake.magnitude}<br>\nDate: ${time.toLocaleString()}`;
  const marker = L.ExtraMarkers.icon({
    icon: "fa-bolt",
    markerColor: "yellow",
    shape: "penta",
    prefix: "fa"
  });
  return L.marker(L.latLng(quake.lat, quake.lng), {
    icon: marker
  }).bindPopup(popup)
}

function getMapInfo() {
  getCityInfo();
  getQuakeInfo();
  getWikiInfo();
}

function clearLayers() {
  cityLayer.clearLayers();
  quakeLayer.clearLayers();
  wikiLayer.clearLayers();
}


// ------------------------------------------------------------------------------- UTILITY ------------------------------------------------------------------------------------

function numberWithPoint(num) {
  return num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ".");
}

function getType() {
  const type = $(".active");
  switch (type[0].title) {
    case "Information":
      $("#countrySubInfo").html("");
      $("#imagesBody").hide();
      $("#dailyForecast").hide();
      $("#covidInfo").hide();
      $("#infoTable").show();
      break;
    case "Covid":
      $("#countrySubInfo").html("Covid Statistics");
      $("#imagesBody").hide();
      $("#dailyForecast").hide();
      $("#infoTable").hide();
      $("#covidInfo").show();
      break;
    case "Pictures":
      $("#countrySubInfo").html("Country Pictures");
      $("#covidInfo").hide();
      $("#dailyForecast").hide();
      $("#infoTable").hide();
      $("#imagesBody").show();
      break;
    case "Weather":
      $("#countrySubInfo").html("Weather Forecast");
      $("#covidInfo").hide();
      $("#imagesBody").hide();
      $("#infoTable").hide();
      $("#dailyForecast").show();
      break;
    default:
      $("#modalInfo").html("Nothing found!");
  }
}

function resetInfoButton() {
  const type = $(".active");
  type.removeClass("active");
  $(".modal-footer button[title='Information'").addClass("active");
  getType();
}

function getTypedButton() {
  $(".modal-footer button").on("click", function () {
    const title = this.title;
    const type = $(".active");
    if (title !== type[0].title) {
      type.removeClass("active");
      $(`.modal-footer button[title=${title}]`).addClass("active");
      getType();
    } else {
      getType();
    }
  })
}

setListCountry();
resetBoundaryButton.addTo(map);

$("#countriesList").on("change", function () {
  currentCountryCode = this.value;
  clearLayers();
  focusOnCountry();
});