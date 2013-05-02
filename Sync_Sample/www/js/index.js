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

var log= function(message){
    console.log(message);
}

var app = {
    config:{
        content_json : "http://contentcontent.eu01.aws.af.cm/json",
        content_json_local : "http://content.loc/json"
    },
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
        app.storage.setItem("data_version", "5.0");
        app.initEvents();
        $(".home").on('click', function () {
            log("click");
            app.cleanPage();
            app.readFolder("ancestor-page");
        });
        app.readFolder("ancestor-page");
        app.updateFileList(app.config.content_json_local);
    },
    handleClick: function () {
        $('.btn').on('click', function () {
            app.cleanPage();
            app.readFolder( $(this).data("path"));
        });
    },
    fail: function (evt) {
        console.log(evt.target.error.code);
    },
    cleanPage: function () {
        $(".medias").empty();
        $(".buttons").empty();
        $(".backButton").remove();
    },
    addBackButton: function (currentPath){
        var path = currentPath.split("/");
        path.splice(-2, 2);
        $('body').append("<button class=\"backButton\">BACK</button>");
        $('.backButton').on('click', function(){
            app.cleanPage();
            app.readFolder(path.join("/"))
            $(this).remove();
        });
    },
    readFolder: function (folderName) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            var folderAbsolutePath = fs.root.fullPath + "/" + folderName;
            var jsonFilePath=folderAbsolutePath+"/content.json";
            fs.root.getFile(jsonFilePath, {}, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.readAsText(file);
                    reader.onloadend = function (evt) {
                        var jsondata = JSON.parse(evt.target.result);
                        var pageContent = {data:[]};//Will add title, description, etc
                        for (var i = 0, len = jsondata.data.length; i < len; i++) {
                            var media=jsondata.data[i],
                                isImage=(media.type=="image")? true: false,
                                isVideo=(media.type=="video")? true: false;
                            pageContent.data.push({
                                name: media.name,
                                path: folderAbsolutePath+"/"+media.name,
                                isImage: isImage,
                                isVideo: isVideo
                            })
                        }
                        var source = $("#media-template").html();
                        var template = Handlebars.compile(source);
                        var context = pageContent.data;
                        $(".media").remove();
                        $("body").append(template(context))
                        app.addBackButton(jsondata.folder);
                    }
                }, app.fail);
            }, app.fail);
            log("here");
            var directoryEntry = new DirectoryEntry(folderName, folderAbsolutePath);
            var directoryReader = directoryEntry.createReader();
            directoryReader.readEntries(function (entries) {
                var i;
                for (i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.isDirectory) {
                        log("directory");
                        var button = "<button class=\"btn\" data-path=\"" + folderName + "/"+ entry.name + "\">" + entry.name + "</button>";
                        $('.buttons').append(button);
                        log($('.buttons'));
//                        var button = "<li  class=\"btn\" data-path=\"" + folderName + "/"+ entry.name + "\">" + entry.name + "data-panel=\"panel-1\"><a href=\"#\"></a></li>"
//                        $('#bl-work-items').append(button);
                    }
                }
                app.handleClick();
            }, app.fail);
        }, app.fail)
    },

    readFileList: function (file) {//Read the global json file and extract informations
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            app.jsonData = JSON.parse(evt.target.result);
            log(app.jsonData.version);
            log(app.storage.getItem("data_version"));
//            if (app.storage.getItem("data_version") != app.jsonData.version) {
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
                log(app.total_data);
                app.downloadItem(app.total_data);
                $('.progress-status').empty().append("<p>Still " + app.jsonData.TotalSize + " bytes to go!</p>");
//            }
//            else{
//                $('.message').html("The content is updated!");
//            }
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
                    var percent = ((app.finished_size + progressEvent.loaded) / app.jsonData.TotalSize) * 500;
                    $(".progressbar-inner").width(percent);
                }
            };
            fileTransfer.download(
                url, filePath, function (entry) {
                    app.count_success++;
                    entry.file(function (file) {
                        app.total_size -= file.size;
                        app.finished_size += file.size;
                        $('.progress-status').empty().append("<p>Still " + app.total_size + " bytes to go!</p>");
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
        }
    },

    fail: function (evt) {
        console.log(evt.target.error.code);
    },

    updateFileList: function (fileListUrl) {//update the global json file
        log("update file list");
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
            fileSystem.root.getFile("fileList", {create: true}, function (fileEntry) {
                app.path = app.filter.exec(fileEntry.fullPath)[0];
                var fileTransfer = new FileTransfer();
                var fileListPath = app.path + "fileList";
                log("before download");
                fileTransfer.download(
                    fileListUrl, fileListPath,
                    function (entry) {
                        entry.file(function (file) {
                            app.readFileList(file);
                        }, app.fail);
                    }, function (error) {
                        $('.message').html("Network is not available");
                        console.log("Download file list error: " + error.source);
                    });
            }, app.fail);
        }, app.fail);
    },
    initEvents: function(){
        $('.reload_button').on('click', function(){
            $('.message').html("Page refreshed");
            app.cleanPage();
            app.readFolder('ancestor-page');

        });
        $('.update_button').on('click', function(){
            log("update");
            app.updateFileList(app.config.content_json_local);
        })
    }
};


