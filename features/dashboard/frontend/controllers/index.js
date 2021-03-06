'use strict';

module.exports = function (controller, component, application) {

    controller.index = function (req, res) {
        res.frontend.render('index')
    };

    controller.changeTheme = function (req, res) {
        let theme = req.params.theme || "acme";

        application.setConfig("frontendTheme", theme).then(function () {
            res.redirect('/');
        });
    };
};