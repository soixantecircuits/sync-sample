/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    path: '',
    filter: /^\/(.*)\//,
    eventFolder: "",
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'

    onDeviceReady: function () {
        var pathName = window.location.pathname.split("/"),
            json = "https://www.dropbox.com/s/kadx8a6zyhvinb9/links.json?dl=1",
            json2 = "https://www.dropbox.com/s/wot3zeg9ljnxsb5/links1.json?dl=1";

        pathName.splice(-3, 3);
        var documantFolder = window.location.protocol + '//' + pathName.join("/") + "/Documents";

        app.updateFileList(json, "MasterPage",
            {
                success: function () {
                    document.getElementById('picture').innerHTML = "<img src=\"" + documantFolder + "/MasterPage/Hello-World.png" + "\" />";
                    document.getElementById('picture').style.display = "block";
                    document.getElementById('movie').innerHTML = "<video width=\"320\" height=\"240\" controls><source src=\"" + documantFolder + "/MasterPage/small.mp4" + "\" type=\"video/mp4\"></video>";
                    document.getElementById('movie').style.display = "block";
                }
            });
    },

    readAsTextMaster: function (file, folderName, option) {
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            var long = evt.target.result,
                jsondata = JSON.parse(long),
                numSuccess = 0,
                numFail = 0,
                pathBis = "",
                url = "",
                elt = "",
                fileTransfer = new FileTransfer();
            for (var cpt = 0; cpt < jsondata.CACHE.length; cpt++) {
                elt = jsondata.CACHE[cpt];
                if (elt != "") {
                    url = option.baseUrl ? baseUrl + elt : elt;
                    pathBis = app.path + folderName + "/" + elt.split('/').pop();
                    fileTransfer.download(
                        url, pathBis, function (entry) {
                            numSuccess++;
                            if (numSuccess === jsondata.CACHE.length) {
                                option.success && option.success();
                            }
                        }, function (error) {
                            console.log("Download error, target: " + elt);
                        });
                }
            }
        };
        reader.readAsText(file);
    },

    fail: function (evt) {
        console.log(evt.target.error.code);
    },

    updateFileList: function (fileListUrl, folderName, option) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
            fileSystem.root.getFile("manifest", {create: true}, function (fileEntry) {
                app.path = app.filter.exec(fileEntry.fullPath)[0];
                fileEntry.file(function (file) {
                    var fileTransfer = new FileTransfer();
                    var manifestPath = app.path + "manifest";
                    fileTransfer.download(
                        fileListUrl, manifestPath,
                        function (entry) {
                            app.readAsTextMaster(file, folderName, {
                                success: option.success
                            });
                        }, function (error) {
                            console.log("Download file list error: " + error.source);
                        });
                }, app.fail);
            }, app.fail);
        }, app.fail);
    }
};
