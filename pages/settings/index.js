require('./index.scss');
window.appVersion = chrome.app.getDetails().version;

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-101959257-1', 'auto');

chrome.storage.local.get(null, function(lstorage){

	chrome.storage.sync.get(null, function(storage){
		console.log(storage);
		var displayTopsites = document.getElementById("display-topsites");
		var largeTopsites = document.getElementById("largeTopsites");
		var time = document.getElementById("24h");
		var focusMode = document.getElementById("focus-mode");
		var reset = document.getElementById("reset");
		var metricWeather = document.getElementById("metric-weather");
		var customWallpaperBrowse = document.getElementById("custom-wallpaper-browse");
		var customWallpaper = document.getElementById("custom-wallpaper");
		var fruumoWallpaper = document.getElementById("fruumo-wallpaper");
		var fruumoBlurWallpaper = document.getElementById("fruumo-blur-wallpaper");
		var searchEngine = document.getElementById("search-engine");
		var appV = document.getElementById("app-version");
		var omniboxSearch = document.getElementById("omnibox-search");
		var fruumoSearch = document.getElementById("fruumo-search");
		var autohideMenu = document.getElementById("autohide-menu");
		var smartDomain = document.getElementById("smartDomain");
		var reduceAnimations = document.getElementById("reduce-animations");
		var reindex = document.getElementById("reindex");
		var reindexText = document.getElementById("reindex-text");
		var preload = document.getElementById("preload");


		//var showFruumoSearch = document.getElementById("show-fruumo-search");
		//var showTime = document.getElementById("show-time");

		appV.innerText = appVersion;

		if(localStorage.defaultSearchBar == "chrome"){
			omniboxSearch.checked = true;
		} else {
			fruumoSearch.checked = true;
		}
		if(!localStorage.smartDomain || localStorage.smartDomain == "true"){
			smartDomain.checked = true;
		} else {
			smartDomain.checked = false;
		}
		if(localStorage.searchDomain){
			searchEngine.value = localStorage.searchDomain;
		}

		if(storage.preload || storage.preload === undefined){
			preload.checked = true;
		}

		if(storage.settingDisplayTopsites){
			displayTopsites.checked = true;
		}
		console.log(storage.disableAnimations);
		if(storage.disableAnimations != undefined && storage.disableAnimations == true){
			reduceAnimations.checked = true;
		} else {
			reduceAnimations.checked = false;
		}
		/*if(storage.timeVisible == true || storage.timeVisible == undefined){
			showTime.checked = true;
		}
		if(storage.searchVisible == true || storage.searchVisible == undefined){
			showFruumoSearch.checked = true;
		}*/
		if(storage.settingIs24h){
			time.checked = true;
		}
		if(storage.largeTopsites){
			largeTopsites.checked = true;
		}
		if(storage.settingAutohideStatusbar == true){
			autohideMenu.checked = true;
		} else {
			autohideMenu.checked = false;
		}
		if(storage.settingFocus){
			focusMode.checked = true;
		}
		if(storage.settingMetric || storage.settingMetric == undefined){
			metricWeather.checked = true;
		}
		if(!lstorage.settingCustomWallpaper || lstorage.settingCustomWallpaper == 'fruumo'){
			fruumoWallpaper.checked = true;
		} else if(lstorage.settingCustomWallpaper == 'custom'){
			customWallpaper.checked = true;
		} else if(lstorage.settingCustomWallpaper == 'fruumo-blur'){
			fruumoBlurWallpaper.checked = true;
		}
		reduceAnimations.addEventListener("click", function(){
			chrome.storage.sync.set({disableAnimations:this.checked});
		});

		fruumoSearch.addEventListener("click", function(){
			localStorage.defaultSearchBar = "fruumo";
		});
		smartDomain.addEventListener("click", function(){
			if(localStorage.smartDomain == "true"){
				localStorage.smartDomain = "false";
			} else {
				localStorage.smartDomain = "true";
			}
		});
		omniboxSearch.addEventListener("click", function(){
			localStorage.defaultSearchBar = "chrome";
		});
		searchEngine.addEventListener("change", function(e){
			localStorage.searchDomain = this.value;
		});
		customWallpaperBrowse.addEventListener("change", function(e){
			if(e.target.files.length == 0)
				return;

    		var file = e.target.files[0];
    		 if (!file.type.match('image.*')) {
       			return;
      		}
      		var reader = new FileReader();
      		reader.onload = function(){
				var dataUrl = reader.result;
				var fontColor = "#FFF";
				chrome.storage.local.set({wallpaper:{image:dataUrl,author:"",location:"", color:"",fontColor:fontColor,luminance:0}});
				chrome.storage.local.set({settingCustomWallpaper:'custom'});
      		};
      		reader.readAsDataURL(file);
		  	ga('send', 'event', 'setting', 'custom wallpaper');

		});
		customWallpaper.addEventListener("click", function(){
			customWallpaperBrowse.click();
		});
		reindex.addEventListener("click", function(){
			reindexText.style.display = "block";
			this.disabled = true;
			chrome.runtime.sendMessage({type:"reindex"}, () => {
				setTimeout(() => {
					reindexText.style.display = "none";
					this.disabled = false;
				}, 5000);
			});
		});
		fruumoWallpaper.addEventListener("click", function(){
			chrome.storage.local.set({settingCustomWallpaper:'fruumo'});
			chrome.alarms.create("refresh-wallpaper", {when:Date.now()+1000, periodInMinutes:60});
			ga('send', 'event', 'setting', 'fruumo wallpaper');
		});
		fruumoBlurWallpaper.addEventListener("click", function(){
			chrome.storage.local.set({settingCustomWallpaper:'fruumo-blur'});
			chrome.alarms.create("refresh-wallpaper", {when:Date.now()+1000, periodInMinutes:60});
			ga('send', 'event', 'setting', 'fruumo blur wallpaper');
		});
		preload.addEventListener("click", function(){
			chrome.storage.sync.set({preload:this.checked});
		});
		metricWeather.addEventListener("click", function(){
			chrome.storage.sync.set({settingMetric:this.checked});
		});
		largeTopsites.addEventListener("click", function(){
			chrome.storage.sync.set({largeTopsites:this.checked});
		});
		displayTopsites.addEventListener("click", function(){
			chrome.storage.sync.set({settingDisplayTopsites:this.checked});
		});
		/*showTime.addEventListener("click", function(){
			chrome.storage.sync.set({timeVisible:this.checked});
		});
		showFruumoSearch.addEventListener("click", function(){
			chrome.storage.sync.set({searchVisible:this.checked});
			if(this.checked == false){
				localStorage.defaultSearchBar = "chrome";
			} else {
				localStorage.defaultSearchBar = "fruumo";
			}
		});*/
		time.addEventListener("click", function(){
			chrome.storage.sync.set({settingIs24h:this.checked});
		});

		autohideMenu.addEventListener("click", function(){
				chrome.storage.sync.set({settingAutohideStatusbar:this.checked});
		});

		focusMode.addEventListener("click", function(){
			chrome.storage.sync.set({settingFocus:this.checked});
		});

		reset.addEventListener("click", function(){
			chrome.storage.sync.set({settingsReset:true}, function(){
				location.reload();
			});
		});
		
		reset.addEventListener("update", function(){
			chrome.runtime.requestUpdateCheck(function(status){
				if(status == "update_available")
					chrome.runtime.reload();
			});
		});

	});
});
require('./weather.js');