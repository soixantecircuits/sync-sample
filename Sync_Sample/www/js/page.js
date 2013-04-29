/**
 * Created with JetBrains AppCode.
 * User: shiyue
 * Date: 29/04/13
 * Time: 14:25
 * To change this template use File | Settings | File Templates.
 */

var page = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();

    },
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function () {
        console.log("this is a page");
        page.readFolder("ancestor-page");
        var source = $("#entry-template").html();
        var template = Handlebars.compile(source);
        var context = {title: "My New Post", body: "This is my first post!"};
        $(".content").append(template(context));
        $(".home").on('click', function () {
            page.cleanPage();
            page.readFolder("ancestor-page");
        });
    },
    readFolder: function (folderName) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            var folderAbsolutePath = fs.root.fullPath + "/" + folderName;
            var directoryEntry = new DirectoryEntry(folderName, folderAbsolutePath);
            var directoryReader = directoryEntry.createReader();
            directoryReader.readEntries(function (entries) {
                var i;
                for (i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.isDirectory) {
                        var button = "<button class=\"btn\" data-name=\"" + entry.name + "\">" + entry.name + "</button>";
                        $('.buttons').append(button);
                    }
                    else if (entry.name.indexOf("jpg") != -1) {
                        var image = "<img class=\"img\" width=\"200px\" height=\"200px\" src=\"" + folderAbsolutePath + "/" + entry.name + "\" data-name=\"" + entry.name + "\"></img>";
                        $('.images').append(image);
                    }
                    else if (entry.name.indexOf("mp4") != -1) {
                        var video = "<video class=\"video\" width=\"200px\" height=\"200px\" controls><source src=\"" + folderAbsolutePath + "/" + entry.name + "\" data-name=\"" + entry.name + "\"></video>";
                        $('.videos').append(video);
                    }
                    else if (entry.name != ".DS_Store") {
                        console.log(entry.name);
                        console.log("this is a file");
                    }
                }
                page.handleClick();
            }, page.fail)
        }, page.fail)
    },
    handleClick: function () {
        $('.btn').on('click', function () {
            var self = this;
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                var file_path = "ancestor-page/" + $(self).data("name") + "/content.json";
                console.log(file_path);
                fileSystem.root.getFile(file_path, {create: true}, function (fileEntry) {
                    fileEntry.file(function (file) {
                        var reader = new FileReader();
                        reader.readAsText(file);
                        reader.onloadend = function (evt) {
                            var jsondata = JSON.parse(evt.target.result);
                            console.log(jsondata);
                        }
                    }, page.fail);
                }, page.fail);
            }, page.fail);

            var source = $("#entry-template").html();
            var template = Handlebars.compile(source);
            var context = {title: "hello", body: "bonjour"};
            $(".content").empty().append(template(context));
            console.log($(self).data("name"));
            page.cleanPage();
            page.readFolder("ancestor-page/" + $(self).data("name"));

        });

    },
    fail: function (evt) {
        console.log(evt.target.error.code);
    },
    cleanPage: function () {
        $(".buttons, .videos, .images").empty();
    }
};