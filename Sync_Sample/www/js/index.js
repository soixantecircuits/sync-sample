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
    db: undefined,
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
        app.db = window.openDatabase("test", "1.0", "Test DB", 1000000);
        app.db.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS URLS (id unique, url, file)');
        });
        var pathName = window.location.pathname.split("/"),
            json = "https://www.dropbox.com/s/kadx8a6zyhvinb9/links.json?dl=1",
            json2 = "https://www.dropbox.com/s/wot3zeg9ljnxsb5/links1.json?dl=1";

        pathName.splice(-3, 3);
        var documantFolder = window.location.protocol + '//' + pathName.join("/") + "/Documents";
        window.resolveLocalFileSystemURI(documantFolder + "/" + "MasterPage", function () {
            var path = window.location.pathname.split("/");
            path.pop();
            window.location.replace(path.join("/") + "/page.html");
        }, function () {
            app.updateFileList(json, "MasterPage");
        });
    },

    readFileList: function (file, folderName, option) {
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            var long = evt.target.result,
                jsondata = JSON.parse(long),
                numSuccess = 0,
                numFail = 0,
                pathBis = "",
                url = "",
                elt = "",
                fileTransfer = undefined;

            $('.progressFile').empty().append("<h1>Still " + jsondata.CACHE.length + " files to go!</h1>");
            for (var cpt = 0; cpt < jsondata.CACHE.length; cpt++) {
                elt = jsondata.CACHE[cpt];

                if (elt.url != "") {

                    url = option.baseUrl ? baseUrl + elt.url : elt.url;
                    pathBis = app.path + folderName + "/" + elt.url.split('/').pop()
                    fileTransfer = new FileTransfer();
                    fileTransfer.onprogress = function (progressEvent) {
                        if (progressEvent.lengthComputable) {
                            var percent = (progressEvent.loaded / progressEvent.total) * 600;
                            $(".progressbar-inner").width(percent);
                            //$(".progressbar-inner").width(percent);
                        }
                    };
                    fileTransfer.download(
                        url, pathBis, function (entry) {
                            numSuccess++;
                            $('.progressFile').empty().append("<h1>Still " + (jsondata.CACHE.length - numSuccess) + " files to go</h1>");
                            if (entry.name.indexOf("mp4") != -1) {
                                $('body').append("<video width=\"320\" height=\"240\" controls><source src=\"" + entry.fullPath + "\" type=\"video/mp4\"></video>");
                            }
                            else if (entry.name.indexOf("png") != -1) {
                                $('body').append("<img src=\"" + entry.fullPath + "\" />");
                            }

                        }, function (error) {
                            console.log("Download error, target: " + elt.url);
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
            fileSystem.root.getFile("fileList", {create: true}, function (fileEntry) {
                app.path = app.filter.exec(fileEntry.fullPath)[0];
                fileEntry.file(function (file) {
                    var fileTransfer = new FileTransfer();
                    var fileListPath = app.path + "fileList";
                    fileTransfer.download(
                        fileListUrl, fileListPath,
                        function (entry) {
                            app.readFileList(file, folderName, {
                                success: option.success
                            });
                        }, function (error) {
                            console.log("Download file list error: " + error.source);
                        });
                }, app.fail);
            }, app.fail);
        }, app.fail);
    },
    populateDB: function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS URLS (id unique, url, file)');
        tx.executeSql('INSERT INTO URLS (id, data) VALUES (1, "First row")');
        tx.executeSql('INSERT INTO URLS (id, data) VALUES (2, "Second row")');
    },
    showContent: function () {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            console.log("Root = " + fs.root.fullPath);
            var directoryEntry = new DirectoryEntry("MasterPage", fs.root.fullPath + "/MasterPage");
            var directoryReader = directoryEntry.createReader();
            directoryReader.readEntries(function (entries) {
                var i;
                for (i = 0; i < entries.length; i++) {
                    console.log(entries[i].name);
                    if (entries[i].name.indexOf("mp4") != -1) {
                        $('body').append("<video width=\"320\" height=\"240\" controls><source src=\"" + entries[i].fullPath + "\" type=\"video/mp4\"></video>");
                    }
                    else if (entries[i].name.indexOf("png") != -1) {
                        $('body').append("<img src=\"" + entries[i].fullPath + "\" />");
                    }

                }
            }, function (error) {
                alert(error.code);
            })
        }, function (error) {
            alert(error.code);
        });
    }
};
