var Tools = {
    saveToCameraRoll: function (types, success, fail) {
        return Cordova.exec(success, fail, "Tools", "saveToCameraRoll", types);
    }
};