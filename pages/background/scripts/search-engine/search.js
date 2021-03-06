/*
 	To do:
 		- Rewrite frecency algorithm
 		- Handle bookmarks removal addition
 		- Handle reseting database function
 		- Frecency is not handling bookmark views properly
 		- Fallback if indexing failure
 		- Show indexing message when indexing
 		*/
 		var fLink = 100;
 		var fTyped = 150;
 		var fAutoBookmark = 75;
 		var fReload,fStartPage,fFormSubmit,fKeyword,fGenerated = 0;
 		var fCutoff1 = 4;
 		var fCutoff2 = 14;
 		var fCutoff3 = 31;
 		var fCutoff4 = 90;
 		var fWeight1 = 100;
 		var fWeight2 = 70;
 		var fWeight3 = 50;
 		var fWeight4 = 30;
 		var fWeight5 = 10;
 		module.exports = {
 			name:"sem",
 			db: undefined,
 			openDb: function(callback, force) {
 				if (!this.db || force) {
 					this.db = openDatabase('fruumodb', '1.0', 'Fruumo data', 100 * 1024 * 1024);
 					this.db.transaction((tx)=>{
 						if(!force)
 							console.log("Creating database tables");
 						tx.executeSql(`CREATE TABLE IF NOT EXISTS urls (
 							url TEXT, hostname TEXT, type NUMERIC,
 							title TEXT, frecency NUMERIC DEFAULT -1,
 							id NUMERIC DEFAULT 0)`);
 						tx.executeSql(`CREATE TABLE IF NOT EXISTS titles (
 							hostname TEXT,
							title TEXT)`) // type1 = history item, type2 = bookmark
 						tx.executeSql('CREATE INDEX IF NOT EXISTS urlindex ON urls (url)');
 						tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS hostnameindex ON urls (hostname)');
 						tx.executeSql('CREATE INDEX IF NOT EXISTS tIndex on titles (hostname)');
 						tx.executeSql('CREATE INDEX IF NOT EXISTS titleindex ON urls (title)');
 						tx.executeSql('CREATE INDEX IF NOT EXISTS frecencyindex ON urls (frecency)');
 						tx.executeSql('CREATE INDEX IF NOT EXISTS typeindex ON urls (type)');
 						callback();
 					});
 				} else {
 					callback();
 				}
 			},
 			onload: function(){
 				localStorage.indexing = "false";
 				var self = this;
 				this.openDb(function(){
			//Count number of items in db and check if indexing is required
			self.db.transaction(function(tx){
				tx.executeSql('SELECT count(*) FROM urls',[], function(tx, results){
					if(results.rows[0]['count(*)'] == 0){
						localStorage.indexing = "true";
						self.buildIndex();
					}
				});
			});
		});

 				chrome.history.onVisited.addListener((historyItem)=>{
 					if(historyItem.url.indexOf("chrome://")!= -1 || historyItem.url.indexOf("chrome-extension://")!= -1)
 						return;
 					self.addItemToIndex(historyItem);
 				});

 				chrome.runtime.onMessage.addListener((request, sender, respond) => {
 					if(request.type != "reindex"){
 						return;
 					}
 					this.db.transaction((tx)=>{
 						tx.executeSql('DROP TABLE urls' ,[], function(tx, results){});
 						tx.executeSql('DROP TABLE titles' ,[], function(tx, results){});
 						this.buildIndex();
 						respond();
 					});
 					return;
 				});
 				chrome.runtime.onMessage.addListener((request,sender, respond)=>{
 					// if(self.indexCount > 0){
 					// 	return respond([{
 					// 		title:"Fruumo is currently building it's index to serve your searches better",
 					// 		url:"https://fruumo.com/indexing"
 					// 	}]);
 					// }
 					if(request.type != "history-search"){
 						return;
 					}
 					var query = request.data.query;
 					if(query[query.length-1] == " "){
 						return respond([]);
 					}
 					this.db.transaction(function(tx){
 						//tx.executeSql('SELECT * FROM urls WHERE ( (hostname LIKE ?) OR (hostname LIKE ?) OR (title LIKE ?) ) ORDER BY frecency DESC LIMIT 4' ,['%'+query+'%','%'+query.replace('www.','')+'%','%'+query+'%'], function(tx, results){
 						// tx.executeSql(`SELECT * FROM urls JOIN 
 						// 		(SELECT hostname, count(title) as tc, title as ntitle FROM titles 
 						// 			WHERE (hostname LIKE ? OR hostname LIKE ?) AND NOT hostname = title  
 						// 			GROUP BY hostname,title 
 						// 			ORDER BY tc DESC LIMIT 10
 						// 		) as f 
 						// 	ON f.hostname = urls.hostname WHERE ((urls.hostname LIKE ?) OR (urls.hostname LIKE ?) OR (urls.title LIKE ?)) GROUP BY urls.hostname HAVING max(f.tc) ORDER BY frecency DESC LIMIT 4 
 						// 	` ,['%'+query+'%','%'+query.replace('www.','')+'%','%'+query+'%','%'+query.replace('www.','')+'%','%'+query+'%'], function(tx, results){
 							tx.executeSql(`SELECT * FROM (
 								SELECT * FROM urls WHERE ((hostname LIKE ?) OR (hostname LIKE ?) OR title LIKE ?)
 								) as u JOIN 
 								(SELECT hostname, count(title) as tc, title as ntitle FROM titles 
 								WHERE (hostname LIKE ? OR hostname LIKE ?) AND NOT hostname = title  
 								GROUP BY hostname,title 
 								ORDER BY tc DESC LIMIT 10
 								) as f 
 								ON f.hostname = u.hostname GROUP BY u.hostname HAVING max(f.tc) ORDER BY frecency DESC LIMIT 4
 								` ,['%'+query+'%','%'+query.replace('www.','')+'%','%'+query+'%', '%'+query+'%','%'+query.replace('www.','')+'%'], function(tx, results){
 									localStorage.indexing = "false";
 									var resultSet = [];
 									for(var i=0;i<=results.rows.length-1; i++){
 										resultSet.push(results.rows.item(i));
 										resultSet[i].title = resultSet[i].ntitle;
 										if(resultSet[i].ntitle == ""){
 											resultSet[i].title = resultSet[i].hostname;
 										}
 									}
 									respond(resultSet);
 								}, function(){
 									self.buildIndex();
 							//setTimeout(function(){self.buildIndex();},0);
 						}
 						);	
 						});

 					return true;
 				});

 				chrome.bookmarks.onCreated.addListener((id, bookmark)=>{
 					this.indexBookmarks(bookmark);
 				});
 				chrome.bookmarks.onRemoved.addListener((id,removeInfo)=>{
 					console.log(id);
 					this.removeItemFromIndex({
 						id:id
 					});
 				});
 			},
	//Assumes DB is open
	buildIndex:function(){
		var self = this;
		localStorage.indexing = "true";
		chrome.history.search({text:"", startTime:new Date().getTime()-1209600000, maxResults:50000}, function(history){
			console.log("Adding to Autocomplete Database:" + history.length);
			for(var i in history){
				historyItem = history[i];
				if(historyItem.url.indexOf("chrome://")!= -1 || historyItem.url.indexOf("chrome-extension://")!= -1)
					continue;
				self.addItemToIndex(historyItem, function(){});
			}
		});
		chrome.bookmarks.getTree((tree)=>{
			for(var i in tree)
				this.indexBookmarks(tree[i]);
		});
	},
	addItemToIndex:function(historyItem, callback){
		var cb = function(){}
		if(callback){
			cb = callback;
		}
		self = this;
		new function(historyItem) {
			self.openDb(() => {
				chrome.history.getVisits({url:historyItem.url}, (visitItems) => {
					visitItems.reverse();
					var extractor = document.createElement('a');
					if(!historyItem.type){
						extractor.href = historyItem.url;
						historyItem.url = extractor.protocol+"//"+extractor.hostname.replace(/\/$/, "");
						historyItem.hostname = extractor.hostname.replace(/\/$/, "");
						historyItem.hostname = historyItem.hostname.replace('www.','');
					} else if(historyItem.type == 2){
						historyItem.hostname = historyItem.url.replace('http://','').replace('https://','');
					}
					self.db.transaction((tx)=>{
						historyItem.frecency = self.score(visitItems, historyItem.type);
						cb();
						if(historyItem.title == "")
							historyItem.title = historyItem.hostname;
						tx.executeSql('UPDATE urls SET frecency=frecency+?,title=? WHERE hostname=?' ,[historyItem.frecency,historyItem.title, historyItem.hostname], (tx, results) => {					
							if(results.rowsAffected < 1){
								tx.executeSql('INSERT INTO urls (id,type, url, hostname, title,frecency) VALUES (?,?, ?,?, ?,?)', [historyItem.rId?historyItem.rId:null,historyItem.type?historyItem.type:1, historyItem.url,historyItem.hostname,historyItem.title,historyItem.frecency],function(){}, console.log);
							}
							tx.executeSql('INSERT INTO titles (hostname, title) VALUES (?,?)', [historyItem.hostname,historyItem.title]);
						});
					});
				});
			});
		}(historyItem);
	},
	removeItemFromIndex: function(removeInfo){
		if(removeInfo.id){
			return this.db.transaction(function(tx){
				tx.executeSql('DELETE FROM urls WHERE id=? ',[removeInfo.id], function(){}, function(){});
			});
		}
		if(removeInfo.hostname){
			return this.db.transaction(function(tx){
				tx.executeSql('DELETE FROM urls WHERE hostname=?',[removeInfo.hostname], function(){}, function(){});
			});	
		}
	},
	indexBookmarks: function(tree){
		//base case
		if(tree.url){
			this.addItemToIndex({
				rId:tree.id,
				url:tree.url,
				title:tree.title,
				type:2
			});
			return;
		}
		if(tree.children.length >0){
			for(var i in tree.children){
				this.indexBookmarks(tree.children[i]);
			}
		}
	},
	score:function(visitItems,type) {
		var vi = '';
		var singleVisitPoints = 0;
		var summedVisitPoints = 0;
		var bonus = 0;
		var bucketWeight = 0;
		var days = 0;
		// For each sampled recent visits to this URL...
		var totalSampledVisits = Math.min(visitItems.length);
		for (var x=0; x < totalSampledVisits; x++) {
			singleVisitPoints = 0;
			bonus = 0;
			bucketWeight = 0;
			days = 0;
			vi = visitItems[x];
			// Determine which bonus score to give
			switch (vi.transition) {
				case "link":
				bonus = fLink;
				break;
				case "typed":
				bonus = fTyped;
				break;
				case "auto_bookmark":
				bonus = fAutoBookmark;
				break;
				case "reload":
				bonus = fReload;
				break;
				case "start_page":
				bonus = fStartPage;
				break;
				case "form_submit":
				bonus = fFormSubmit;
				break;
				case "keyword":
				bonus = fKeyword;
				break;
				case "generated":
				bonus = fGenerated;
				break;
				default:
				break;
			}
			//bookmark bonus
			if(type == 2){
				bonus = 200;
			}

			// Determine the weight of the score, based on the age of the visit
			days = ((new Date().getTime()/1000) - (vi.visitTime/1000)) / 86400;
			if (days < fCutoff1) {
				bucketWeight = fWeight1;
			} else if (days < fCutoff2) {
				bucketWeight = fWeight2;
			} else if (days < fCutoff3) {
				bucketWeight = fWeight3;
			} else if (days < fCutoff4) {
				bucketWeight = fWeight4;
			} else {
				bucketWeight = fWeight5;
			}

			// Calculate the points
			singleVisitPoints = (bonus / 100) * bucketWeight;
			if(isNaN(singleVisitPoints)){
				singleVisitPoints = 0;
			}
			summedVisitPoints = summedVisitPoints + singleVisitPoints;
		}

		// Calculate and return the frecency score for the URL
		return Math.ceil(visitItems.length * summedVisitPoints / totalSampledVisits);
	}
}