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
        page.readFolder("ancestor-page");
        $(".home").on('click', function () {
            page.cleanPage();
            page.readFolder("ancestor-page");
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
                        page.addBackButton(jsondata.folder);
                    }
                }, page.fail);
            }, page.fail);
            var directoryEntry = new DirectoryEntry(folderName, folderAbsolutePath);
            var directoryReader = directoryEntry.createReader();
            directoryReader.readEntries(function (entries) {
                var i;
                for (i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.isDirectory) {
                        var button = "<button class=\"btn\" data-path=\"" + folderName + "/"+ entry.name + "\">" + entry.name + "</button>";
                        $('.buttons').append(button);
                    }
                }
                page.handleClick();
            }, page.fail);
        }, page.fail)
    },
    handleClick: function () {
        $('.btn').on('click', function () {
            page.cleanPage();
            page.readFolder( $(this).data("path"));
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
            page.cleanPage();
            page.readFolder(path.join("/"))
            $(this).remove();
        });
    }
};