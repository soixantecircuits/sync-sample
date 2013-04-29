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
    count_success: 0,
    total_file: 0,
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function () {
        console.log("Document is ready");
        var pathName = window.location.pathname.split("/"),
            content_json = "http://content.loc/json";

        pathName.splice(-3, 3);
        var documantFolder = window.location.protocol + '//' + pathName.join("/") + "/Documents";
        window.resolveLocalFileSystemURI(documantFolder + "/" + "ancestor-page", function () {
            var path = window.location.pathname.split("/");
            path.pop();
            window.location.replace(path.join("/") + "/page.html");
        }, function () {
        app.updateFileList(content_json, "ancestor-page");
        });
    },

    readFileList: function (file, folderName, option) {
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            var jsondata = JSON.parse(evt.target.result);
            app.total_file = jsondata.CACHE.length;
            for (var i = 0, len = jsondata.CACHE.length; i < len; i++) {
                var page = jsondata.CACHE[i];
                app.downloadPage(page);
            }
            $('.progressFile').empty().append("<h1>Still " + jsondata.TotalSize + " bytes to go!</h1>");
        };
        reader.readAsText(file);
    },
    downloadPage: function (page) {
        var data = [];
        for (var i = 0, len = page.data.length; i < len; i++) {
            data.push({
                url: page.data[i].url,
                name: page.folder
            })
        }
        var jsondata = JSON.stringify(page);
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
            fileSystem.root.getFile(page.folder + "content.json", {create: true}, function (fileEntry) {
                fileEntry.createWriter(function (writer) {
                    writer.write(jsondata);
                }, app.fail);
            }, app.fail);
        }, app.fail);
        app.downloadItem(data, page.folder);
    },
    downloadItem: function (data, folderName) {
        var numSuccess = 0,
            pathBis = "",
            url = "",
            fileTransfer = undefined;
        if (data.length > 0) {
            var elt = data.pop();
            url = elt.url;
            pathBis = app.path + folderName + "/" + elt.url.split('/').pop();
            fileTransfer = new FileTransfer();
            fileTransfer.onprogress = function (progressEvent) {
                if (progressEvent.lengthComputable) {
                    var percent = (progressEvent.loaded / progressEvent.total) * 600;
                    $(".progressbar-inner").width(percent);
                }
            };
            fileTransfer.download(
                url, pathBis, function (entry) {
                    app.count_success++;
                    numSuccess++;
                    var image_formats = "";
                    image_formats.replace(/ (png|jpg|jpeg)$/gi, "");
//                    $('.progressFile').empty().append("<h1>Still " + (jsondata.CACHE.length - numSuccess) + " files to go</h1>");

                    $('.progressFile').empty().append("<h1>Still " + data.length + " files to go</h1>");
                    if (entry.name.indexOf("mp4") != -1) {
                        $('body').append("<video width=\"320\" height=\"240\" controls><source src=\"" + entry.fullPath + "\" type=\"video/mp4\"></video>");
                    }
                    else if (entry.name.indexOf(image_formats) != -1) {
                        $('body').append("<img width=\"200px\" height=\"200px\" src=\"" + entry.fullPath + "\" />");
                    }
                    $(".progressbar-inner").width(0);
                    app.downloadItem(data, folderName);

                }, function (error) {
                    console.log("Download error, target: " + elt.url);
                    app.downloadItem(data, folderName);
                });
        }
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
                            app.readFileList(file, folderName);

                        }, function (error) {
                            console.log("Download file list error: " + error.source);
                        });
                }, app.fail);
            }, app.fail);
        }, app.fail);
    }
};
