// ==UserScript==
// @name        C&C Tiberium Alliances Flunik Tools: Custom AutoUpgrade
// @namespace   AutoUpgrade
// @description Only uses the AutoUpgrade Feature For C&C Tiberium Alliances
// @include     http*://prodgame*.alliances.commandandconquer.com/*/index.aspx*
// @author      Flunik dbendure RobertT KRS_L
// @version     20130222a
// ==/UserScript==

/*
Original Flunik tools would upgrade buildings randomly. I have tried to make the upgrading more
intelligent. Note some of the logic in script is different but here were the original goals.

Currently there is no real logic for unit upgrades other than those are done lowest level offence
unit first followed by lowest level defence unit. Unit upgrades will spend crystals as soon as
available at the moment but I would like to get those to wait until crystals is full as well. 

As far as buildings go, first off I try to keep the base at maximum capacity since that gives us the 
opportunity to use the resources in ways we see fit. This script will kick in when Tiberium
is full to upgrade the best building it can. It will also try to upgrade the CC or DHQ any time
the offence or defence units have maxed out.

Need to come up with rules for harvester/silo/power ideally..

Here is the basic logic for building upgrades:  
If CY is less than level 25 upgrade CY (max build sites in base)
If CC < Base level upgrade CC
If Offence Level = CC level upgrade CC
If DHQ < Base level upgrade DHQ
If DHQ < CC upgrade DHQ
If DF < DHQ upgrade DF
If support < DHQ upgrade support
If Airport/Barracks/Vehicles < CC level upgrade repair building
(Version A) If cost of upgrade of any of the main buildings exceeds silo capacity upgrade silos 
(Version B) If rate of production would cause silos full in less than 24 hours upgrade silos
(Version A) Upgrade lowest level normal building 
(Version B) Try and determine what building will give greatest benefit to resource production and upgrade it
*/


(function () {
	var FlunikTools_main = function () {
		try {
			function CCTAWrapperIsInstalled() {
				return (typeof (CCTAWrapper_IsInstalled) != 'undefined' && CCTAWrapper_IsInstalled);
			}

			function createFlunikTools() {
				console.log('Custom FLUNIKTOLS createFlunikTools');

				qx.Class.define("FlunikTools.Main", {
					type: "singleton",
					extend: qx.core.Object,
					members: {
						AutoUpdateButton: null,
						autoUpdateHandle: null,

						initialize: function () {

							console.log('Custom FLUNIKTOLS initialize');
							AutoUpdateButton = new qx.ui.form.Button("Flunik", null).set({
								toolTipText: "Flunik",
								width: 100,
								height: 40,
								maxWidth: 100,
								maxHeight: 40,
								appearance: ("button-playarea-mode-frame"), //"button-standard-"+factionText), button-playarea-mode-red-frame
								center: true
							});

							AutoUpdateButton.addListener("click", function (e) {
								if (window.FlunikTools.Main.getInstance().autoUpdateHandle != null) {
									window.FlunikTools.Main.getInstance().stopAutoUpdate();
									AutoUpdateButton.setLabel("Flunik OFF");
									//alert("Stopped auto-update");
								} else {
									//window.FlunikTools.Main.getInstance().startAutoUpdate("Silo,Command Center");
									window.FlunikTools.Main.getInstance().startAutoUpdate();
									AutoUpdateButton.setLabel("Flunik ON");
									//alert("Started auto-update");
								}
							}, this);

							var app = qx.core.Init.getApplication();

							app.getDesktop().add(AutoUpdateButton, {
								right: 120,
								bottom: 80
							});

						},

						 get_IsFull: function (city, type) {
							if (city.GetResourceCount(type) < (city.GetResourceMaxStorage(type)*0.80)) {
								return false;
							} else {
								return true;
							}
						},

						startAutoUpdate: function () {
							
							var _this = FlunikTools.Main.getInstance();
							// and now you can just use - Thx KRS_L
							//var tiberiumisfull = _this.get_IsFull(city, ClientLib.Base.EResourceType.Tiberium);
							
							this.autoUpgrade();
							this.autoUpdateHandle = window.setInterval(this.autoUpgrade, 60000);
						},
						
						stopAutoUpdate: function () {
							window.clearInterval(this.autoUpdateHandle);
							this.autoUpdateHandle = null;
						},

						autoUpgrade: function () {
							for (var nCity in ClientLib.Data.MainData.GetInstance().get_Cities().get_AllCities().d) {
								var city = ClientLib.Data.MainData.GetInstance().get_Cities().get_AllCities().d[nCity];
								var cityname = city.get_Name();
								var baselvl = city.get_LvlBase();
								//var player = city.get_PlayerName();
								var buildings = city.get_Buildings();
								var lowestbuildinglevel = 999;
								var lowestdefencelevel = 999;
								var lowestoffencelevel = 999;
								var lowestupgdefencelevel = 999;
								var lowestupgoffencelevel = 999;
					//			console.debug("FLUNIK: ----------- Analyzing city %d with level %d", cityname, baselvl);

								// get_IsFull(city, ClientLib.Base.EResourceType.Crystal);
								// or
// broken on 2nd pass?			var tiberiumisfull = this.get_IsFull(city, ClientLib.Base.EResourceType.Tiberium);
//								var tiberiumisfull = FlunikTools.Main.prototype.get_IsFull(city, ClientLib.Base.EResourceType.Tiberium);
//								var crystalisfull = FlunikTools.Main.prototype.get_IsFull(city, ClientLib.Base.EResourceType.Crystal);
//								console.debug("FLUNIK: Tiberium current %d max %d",city.GetResourceCount(ClientLib.Base.EResourceType.Tiberium),city.GetResourceMaxStorage(ClientLib.Base.EResourceType.Tiberium));
//								console.debug("FLUNIK: Crystal current %d max %d",city.GetResourceCount(ClientLib.Base.EResourceType.Crystal),city.GetResourceMaxStorage(ClientLib.Base.EResourceType.Crystal));

								var currenttibpct = Math.round(10000*city.GetResourceCount(ClientLib.Base.EResourceType.Tiberium)/city.GetResourceMaxStorage(ClientLib.Base.EResourceType.Tiberium))/100 ;
								var currentcrypct = Math.round(10000*city.GetResourceCount(ClientLib.Base.EResourceType.Crystal)/city.GetResourceMaxStorage(ClientLib.Base.EResourceType.Crystal))/100 ;
								//console.debug("FLUNIK: Crystal is %d",currentcrypct);
								//console.debug("FLUNIK: Tiberium is %d",currenttibpct);
								
								

								var upgradeinfo = "FLUNIK: "+cityname;
								
								var units = city.get_CityUnitsData();
								var offenceUnits = units.get_OffenseUnits();
								for (var nUnit in offenceUnits.d) {
									var unit = offenceUnits.d[nUnit];
									var unitlvl = unit.get_CurrentLevel();
									var unit_obj = {
											cityid: city.get_Id(),
											unitId: unit.get_Id()
									};

									if (unitlvl<lowestoffencelevel) {
										var lowestoffencelevel=unitlvl;
									}

									if (unitlvl<lowestupgoffencelevel && unit.CanUpgrade()) {
										var lowestupgoffencelevel=unitlvl;
										var lowestupgoffenceunit_obj=unit_obj;
										var unitname = unit.get_UnitGameData_Obj().dn;
									};
									//console.debug("FLUNIK: OFFENCE - unitlvl: %d lowest: %d lowestupg: %d", unitlvl,lowestoffencelevel,lowestupgoffencelevel);
								};
								if (lowestupgoffencelevel<999) {
									var upgradeinfo = upgradeinfo+" - O: "+unitname+" "+lowestupgoffencelevel;
						//			var upgradeinfo = "FLUNIK: %d Upgrading %d offence unit from level of: %d",cityname, unitname, lowestupgoffencelevel);
									ClientLib.Net.CommunicationManager.GetInstance().SendCommand("UnitUpgrade", lowestupgoffenceunit_obj, null, null, true);
						//		} else {
						//			console.debug("FLUNIK: No offence units are upgradable - lowest level: %d", lowestoffencelevel);
								}

								var defenceUnits = units.get_DefenseUnits();
								for (var nUnit in defenceUnits.d) {
									var unit = defenceUnits.d[nUnit];
									var unitlvl = unit.get_CurrentLevel();
									var unit_obj = {
											cityid: city.get_Id(),
											unitId: unit.get_Id()
									};

									if (unitlvl<lowestdefencelevel) {
										var lowestdefencelevel=unitlvl;
									}

									if (unitlvl < lowestupgdefencelevel && unit.CanUpgrade()) {
										var lowestupgdefencelevel=unitlvl;
										var lowestupgdefenceunit_obj=unit_obj;
										var unitname = unit.get_UnitGameData_Obj().dn;
									};
									//console.debug("FLUNIK: DEFENCE - unitlvl: %d lowest: %d lowestupg: %d", unitlvl,lowestdefencelevel,lowestupgdefencelevel);

								};
								if (lowestupgdefencelevel<999) {
									var upgradeinfo = upgradeinfo+" - D: "+unitname+" "+lowestupgdefencelevel;
						//			console.debug("FLUNIK: %d Upgrading %d defence unit from level of: %d",cityname, unitname, lowestupgdefencelevel);
									ClientLib.Net.CommunicationManager.GetInstance().SendCommand("UnitUpgrade", lowestupgdefenceunit_obj, null, null, true);
						//		} else {
						//			console.debug("FLUNIK: No defence units are upgradable - lowest level: %d", lowestdefencelevel);
								}

								//if (lowestupgoffencelevel<999 || lowestupgdefencelevel<999) {
							//		console.debug(upgradeinfo);
								//}
								var CY=CC=DHQ=DF=SUPPORT=INF=VEH=AIR=lowestbuilding=null;
								var infRT=vehRT=airRT=numPOW=numREF=0;
								
								for (var nBuildings in buildings.d) {
									var building = buildings.d[nBuildings];
									var name = building.get_UnitGameData_Obj().dn;
									var buildinglvl = building.get_CurrentLevel();
									var building_obj = {
											cityid: city.get_Id(),
											buildingid: building.get_Id(),
											posX: building.get_CoordX(),
											posY: building.get_CoordY(),
											isPaid: true
									};

									//console.debug("The %d building has a level of: %d", name, buildinglvl);
									if	(buildinglvl < lowestbuildinglevel && building.CanUpgrade())	{
										var lowestbuildinglevel=buildinglvl;
										var lowestbuilding=building;
										var lowestbuildingname=name;
									};

									if 	(name == "Construction Yard") {
										var CY=building;
										continue;
									};            
									if 	(name == "Command Center") {
										var CC=building;
										continue;
									};            
									if 	(name == "Defense HQ") {
										var DHQ=building;
										continue;
									};            
									if 	(name == "Defense Facility") {
										var DF=building;
										continue;
									};            
									if 	(name == "Falcon Support" || name == "Ion Cannon Support" || name == "Skystrike Support" ||
											name == "Blade of Kane" || name == "Eye of Kane" || name == "Fist of Kane" ) {
										var SUPPORT=building;
										continue;
									};            
									if 	(name == "Barracks" || name == "Hand of Nod") {
										var INF=building;
										var infRT = city.get_CityUnitsData().GetRepairTimeFromEUnitGroup(ClientLib.Data.EUnitGroup.Infantry, false);
										continue;
									};            
									if 	(name == "Factory" || name == "War Factory") {
										var VEH=building;
										var vehRT = city.get_CityUnitsData().GetRepairTimeFromEUnitGroup(ClientLib.Data.EUnitGroup.Vehicle, false);
										continue;
									};            
									if 	(name == "Airfield" || name == "Airport") {
										var AIR=building;
										var airRT = city.get_CityUnitsData().GetRepairTimeFromEUnitGroup(ClientLib.Data.EUnitGroup.Aircraft, false);
										continue;
									}; 
									if 	(name == "Refinery") {
										var numREF=numREF+1;
										continue;
									}; 
									if 	(name == "Silo") {
										continue;
									}; 
									if 	(name == "Harvester") {
										continue;
									}; 
									if 	(name == "Power Plant") {
										continue;
									}; 
									if 	(name == "Accumulator") {
										continue;
									}; 
									
									console.debug("FLUNIK: You should NEVER see this - If you do the name of the building is: %d and is level: %d", name, buildinglvl);
								}; // for buildings 

//								FLUNIK: The Harvester building has a level of: 15 (program):234
//								FLUNIK: The Power Plant building has a level of: 15 (program):234
//								FLUNIK: The Silo building has a level of: 15 (program):234
								
								var maxRT = Math.max(airRT,vehRT,infRT);
								switch (maxRT) {
								case airRT:
									// Air has highest RT
									var REPAIR=AIR;
									var repairname="airport";
									break;
								case vehRT:
									// Vehicle has highest RT
									var REPAIR=VEH;
									var repairname="vehicle";
									break;
								case infRT:
									// Infantry has highest RT
									var REPAIR=INF;
									var repairname="infantry";
									break;
								};
								//console.debug("FLUNIK: %d The %d level is %d has repair time of %d",cityname,repairname, REPAIR.get_CurrentLevel(), maxRT);
								//console.debug("FLUNIK: %d Repair info in seconds: Max %d AIR %d VEH %d INF %d",cityname, maxRT, airRT, vehRT, infRT);

/*								if (lowestbuilding != null) { 
									if (lowestbuildinglevel<(baselvl*0.66)) {
										console.debug("FLUNIK: %d new building upgrade - %d level %d",cityname, lowestbuildingname, lowestbuildinglevel);
										lowestbuilding.Upgrade();
										return;
									}
								}
*/
								
								var SKIPS="";

								if (currentcrypct>80) {
									//			console.debug("FLUNIK: Crystal is full - checking if CC or DHQ upgrades is required");
									var tryDHQ=true;
									if (CC != null) {
										var tryDHQ=false;
										if (CC.get_CurrentLevel() == lowestoffencelevel) {
											if (CC.CanUpgrade()) {
												console.debug(upgradeinfo+" - Crystal is full - Upgrading CC since offencelevel is maximum");
												CC.Upgrade();
												return;
											} else {
												var tryDHQ=true;
											}
										}
									};

									// tryDHQ will only be true if CC exists, offence level is maxed and CC unable to upgrade
									if (DHQ != null && tryDHQ) { 
										if (DHQ.get_CurrentLevel() == lowestdefencelevel && DHQ.CanUpgrade()) {
											console.debug(upgradeinfo+" - Crystal is full - Upgrading DHQ since defencelevel is maximum");
											DHQ.Upgrade();
											return;
										}
									};
								};

								if (CY != null) { 
									if (CY.get_CurrentLevel() < 25) {
										if (CY.CanUpgrade()) {
											//console.debug("FLUNIK: %d The CY building level %d is lower than 25 - Upgrading",cityname, CY.get_CurrentLevel());
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: CY");
											CY.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"CY,";
											//console.debug("FLUNIK: %d The CY building level %d is lower than 25 but cant upgrade - skipping to next",cityname, CY.get_CurrentLevel());
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									}
								};

								if (CC != null) { 
									if (CC.get_CurrentLevel() < baselvl) {
										if (CC.CanUpgrade()) {
											console.debug("FLUNIK: %d The CC building level %d is lower than base level %d - Upgrading",cityname, CC.get_CurrentLevel(), baselvl);
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: CC");
											CC.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"CC,";
											//console.debug("FLUNIK: %d The CC building level %d is lower than base level %d but cant upgrade - skipping to next",cityname, CC.get_CurrentLevel(), baselvl);
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									}
								};

								if (CC != null) { 
									if (CC.get_CurrentLevel() == lowestoffencelevel) {
										if (CC.CanUpgrade()) {
											//console.debug("FLUNIK: %d The CC building level %d matches lowest offence level %d - Upgrading",cityname, CC.get_CurrentLevel(), lowestoffencelevel);
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: CC");
											CC.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"CC,";
											//console.debug("FLUNIK: %d The CC building level %d matches lowest offence level %d but cant upgrade - skipping to next",cityname, CC.get_CurrentLevel(), lowestoffencelevel);
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									}
								};

								if (DHQ != null) {
									// Upgrade DHQ if it is lower level than the CC and defence level is maxed
									var tryDHQ=true;
									if (CC != null) {
										var tryDHQ=false;
										if (CC.get_CurrentLevel()>(DHQ.get_CurrentLevel()+2)) {
											var tryDHQ=true;
										}
									}

									if (DHQ.get_CurrentLevel() == lowestdefencelevel && tryDHQ) {
										if (DHQ.CanUpgrade()) {
											//console.debug("FLUNIK: %d The DHQ building level %d matches lowest defence level %d - Upgrading",cityname, DHQ.get_CurrentLevel(), lowestdefencelevel);
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: DHQ");
											DHQ.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"DHQ,";
											//console.debug("FLUNIK: %d The DHQ building level %d matches lowest defence level %d but cant upgrade - skipping to next",cityname, DHQ.get_CurrentLevel(), lowestoffencelevel);
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									}
								};

								if (DF != null && DHQ != null) { 
									if (DF.get_CurrentLevel() < DHQ.get_CurrentLevel()) {
										if (DF.CanUpgrade()) {
											//console.debug("FLUNIK: %d The DF building level %d is lower than DHQ level %d - Upgrading",cityname, DF.get_CurrentLevel(), DHQ.get_CurrentLevel());
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: DF");
											DF.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"DF,";
											//console.debug("FLUNIK: %d The DF building level %d is lower than DHQ level %d but cant upgrade - skipping to next",cityname, DF.get_CurrentLevel(), DHQ.get_CurrentLevel());
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									}
								};

								if (SUPPORT != null && DHQ != null) { 
									if (SUPPORT.get_CurrentLevel() < DHQ.get_CurrentLevel()) {
										if (SUPPORT.CanUpgrade()) {
											//console.debug("FLUNIK: %d The SUPPORT building level %d is lower than DHQ level %d - Upgrading",cityname, SUPPORT.get_CurrentLevel(), DHQ.get_CurrentLevel());
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: SUPPORT");
											SUPPORT.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"SUPPORT,";
											//console.debug("FLUNIK: %d The SUPPORT building level %d is lower than DHQ level %d but cant upgrade - skipping to next",cityname, SUPPORT.get_CurrentLevel(), DHQ.get_CurrentLevel());
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									}
								};

								
								if (REPAIR != null && CC != null) {
									if (maxRT>14400 && REPAIR.get_CurrentLevel()<CC.get_CurrentLevel()) { // No point upgrading unless RT > 4 hours (14400 seconds)
										//console.debug("FLUNIK: %d Repair info in seconds: Max %d AIR %d VEH %d INF %d",cityname, maxRT, airRT, vehRT, infRT);
										if (REPAIR.CanUpgrade()) {
											//console.debug("FLUNIK: %d The %d level %d has repair time of %d - Upgrading",cityname,repairname, REPAIR.get_CurrentLevel(), maxRT);
											console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: REPAIR");
											REPAIR.Upgrade();
											return;
										} else {
											var SKIPS=SKIPS+"REPAIR,";
											//console.debug("FLUNIK: %d The %d level %d has repair time %d but cant upgrade - skipping to next",cityname,repairname, REPAIR.get_CurrentLevel(), maxRT);
											if (currenttibpct<80) { 
												console.debug(upgradeinfo+" - Skipped: "+SKIPS)
												continue; 
											}
										};
									};
								};

								if (lowestbuilding != null) { 
									if (lowestbuilding.CanUpgrade() && currenttibpct>80) {
										//console.debug("FLUNIK: %d Default upgrade - lowest building is %d level %d",cityname, lowestbuildingname, lowestbuildinglevel);
										console.debug(upgradeinfo+" - Skipped: "+SKIPS+" - Upg: "+lowestbuildingname+" lvl: "+lowestbuildinglevel);
										lowestbuilding.Upgrade();
										return;
									}
								}
								if (SKIPS != "" || upgradeinfo != "FLUNIK: "+cityname ){
									console.debug(upgradeinfo+" - Skipped: "+SKIPS)
								}

							}; // for city
						} // function autoupgrade
					} // members
				}); // class define
			} // create fluniktools
		} catch (e) {
			console.log("createFlunikTools: ", e);
		} // end try catch

		function FlunikTools_checkIfLoaded() {
			try {
				if (typeof qx != 'undefined' && qx.core.Init.getApplication() && qx.core.Init.getApplication().getUIItem(ClientLib.Data.Missions.PATH.BAR_NAVIGATION) && qx.core.Init.getApplication().getUIItem(ClientLib.Data.Missions.PATH.BAR_NAVIGATION).isVisible()) {
					createFlunikTools();

					for (var key in ClientLib.Data.CityBuilding.prototype) { //KRS_L
						if (ClientLib.Data.CityBuilding.prototype[key] !== null) {
							var strFunction = ClientLib.Data.CityBuilding.prototype[key].toString();
							if (typeof ClientLib.Data.CityBuilding.prototype[key] === 'function' & strFunction.indexOf("true).l.length==0)){return true;}}return false") > -1) {
								ClientLib.Data.CityBuilding.prototype.CanUpgrade = ClientLib.Data.CityBuilding.prototype[key];
								break;
							}
						}
					}

					for (var key in ClientLib.Data.CityUnit.prototype) { //KRS_L
						if (ClientLib.Data.CityUnit.prototype[key] !== null) {
							var strFunction = ClientLib.Data.CityUnit.prototype[key].toString();
							if (typeof ClientLib.Data.CityUnit.prototype[key] === 'function' & strFunction.indexOf(".l.length>0)){return false;}") > -1) {
								ClientLib.Data.CityUnit.prototype.CanUpgrade = ClientLib.Data.CityUnit.prototype[key];
								break;
							}
						}
					}

					for (var key in ClientLib.Data.CityBuilding.prototype) {
						if (typeof ClientLib.Data.CityBuilding.prototype[key] === 'function') {
							var strFunction = ClientLib.Data.CityBuilding.prototype[key].toString();
							if (strFunction.indexOf("()+1);this.") > -1) {
								ClientLib.Data.CityBuilding.prototype.Upgrade = ClientLib.Data.CityBuilding.prototype[key];
								break;
							}
						}
					}



					window.FlunikTools.Main.getInstance().initialize();
				} else {
					window.setTimeout(FlunikTools_checkIfLoaded, 1000);
				}
			} catch (e) {
				console.log("FlunikTools_checkIfLoaded: ", e);
			}
		}
		if (/commandandconquer\.com/i.test(document.domain)) {
			window.setTimeout(FlunikTools_checkIfLoaded, 1000);
		}
	}; // FlunikTools_main function

	try {
		var FlunikScript = document.createElement("script");
		FlunikScript.innerHTML = "(" + FlunikTools_main.toString() + ")();";
		FlunikScript.type = "text/javascript";
		if (/commandandconquer\.com/i.test(document.domain)) {
			document.getElementsByTagName("head")[0].appendChild(FlunikScript);
		}
	} catch (e) {
		console.log("FlunikTools: init error: ", e);
	}
})();