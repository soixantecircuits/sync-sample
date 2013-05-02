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
    total_data: [],
    jsonData: undefined,
    total_size: 0,
    finished_size: 0,
    storage: window.localStorage,
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
            content_json = "http://contentcontent.eu01.aws.af.cm/json",
            content_json_local = "http://content.loc/json";
        pathName.splice(-3, 3);
        var documantFolder = window.location.protocol + '//' + pathName.join("/") + "/Documents";
//        window.resolveLocalFileSystemURI(documantFolder + "/" + "ancestor-page", function () {
//            if (confirm("Content exist, show content?")){
//                var path = window.location.pathname.split("/");
//                path.pop();
//                window.location.replace(path.join("/") + "/page.html");
//            }
//            else{
//                app.updateFileList(content_json_local, "ancestor-page");
//            }
//        }, function () {
        app.updateFileList(content_json_local, "ancestor-page");
//        });
    },

    readFileList: function (file) {//Read the global json file and extract informations
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            app.jsonData = JSON.parse(evt.target.result);
            if (app.storage.getItem("data_version") != app.jsonData.version) {
                app.storage.setItem("data_version", app.jsonData.version);
                app.total_file = app.jsonData.CACHE.length;
                app.total_size = app.jsonData.TotalSize;
                for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
                    var page = app.jsonData.CACHE[i];
                    for (var j = 0, len_page = page.data.length; j < len_page; j++) {
                        app.total_data.push({
                            url: page.data[j].url,
                            folderName: page.folder
                        });
                    }
                }
                app.downloadItem(app.total_data);
                $('.progressFile').empty().append("<h1>Still " + app.jsonData.TotalSize + " bytes to go!</h1>");
            }
        };
        reader.readAsText(file);
    },
    downloadItem: function (data) {
        var filePath = "",
            url = "",
            page = undefined,
            folder = "",
            jsonStringData = "",
            fileTransfer = undefined;
        if (data.length > 0) {
            var elt = data.pop();
            url = elt.url;
            var folderName = elt.folderName;
            filePath = app.path + folderName + "/" + elt.url.split('/').pop();
            fileTransfer = new FileTransfer();
            fileTransfer.onprogress = function (progressEvent) {
                if (progressEvent.lengthComputable) {
                    var percent = ((app.finished_size + progressEvent.loaded) / app.jsonData.TotalSize) * 600;
                    $(".progressbar-inner").width(percent);
                }
            };
            fileTransfer.download(
                url, filePath, function (entry) {
                    app.count_success++;
                    entry.file(function (file) {
                        app.total_size -= file.size;
                        app.finished_size += file.size;
                        $('.progressFile').empty().append("<h1>Still " + app.total_size + " bytes to go!</h1>");
                    }, app.fail)
                    app.downloadItem(data);
                }, function (error) {
                    console.log("Download error, target: " + elt.url);
                    app.downloadItem(data);
                });
        }
        else {//Download finished
            //Add content.json to each folder
            var writeContentJson = function (jsonStringData, folder) {
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                    fileSystem.root.getFile(folder + "content.json", {create: true}, function (fileEntry) {
                        fileEntry.createWriter(function (writer) {
                            writer.write(jsonStringData);
                        }, app.fail);
                    }, app.fail);
                }, app.fail);
            }
            for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
                page = app.jsonData.CACHE[i];
                folder = page.folder;
                jsonStringData = JSON.stringify(page);
                writeContentJson(jsonStringData, folder);
            }
//            setTimeout(function () {
//                if (confirm("Download finished, View content?")){
//                    var path = window.location.pathname.split("/");
//                    path.pop();
//                    window.location.replace(path.join("/") + "/page.html");
//                }
//            }, 1000)
        }
    },

    fail: function (evt) {
        console.log(evt.target.error.code);
    },

    updateFileList: function (fileListUrl, folderName) {//update the global json file
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
            fileSystem.root.getFile("fileList", {create: true}, function (fileEntry) {
                app.path = app.filter.exec(fileEntry.fullPath)[0];
                var fileTransfer = new FileTransfer();
                var fileListPath = app.path + "fileList";
                fileTransfer.download(
                    fileListUrl, fileListPath,
                    function (entry) {
                        entry.file(function (file) {
                            app.readFileList(file, folderName);
                        }, app.fail);
                    }, function (error) {
                        $('.progressFile > h1').empty().html("Network is not available");
                        console.log("Download file list error: " + error.source);
                    });
            }, app.fail);
        }, app.fail);
    }
};
