'use strict';

let _ = require('lodash');
let fs = require('fs');

let path = require('path');
let slug = require('slug');
let promise = require('bluebird');
let writeFileAsync = promise.promisify(require('fs').writeFile);
let readdirAsync = promise.promisify(require('fs').readdir);
let formidable = require('formidable');
//global function
let global_functions = require(__base+'/library/js_utilities/helper/global');
let createFilter = require(__base+'/library/js_utilities/createFilter');
let acl = require(__base+'/library/js_utilities/helper/acl');

let _log = require('arrowjs').logger;

//
promise.promisifyAll(formidable);

let edit_template = 'new';
let folder_upload = '/img/users/';
let route = 'users';

module.exports = function (controller,component,app) {
    let redis = app.redisClient;
    let adminPrefix = app.getConfig('admin_prefix') || 'admin';
    let redisPrefix = app.getConfig('redis_prefix') || 'arrowCMS_';
    let itemOfPage = app.getConfig('pagination').numberItem || 10;



    controller.list = function (req, res) {

        let tableStructure = [
            {
                column: "id",
                width: '8%',
                header: "ID",
                filter: {
                    model: 'user',
                    data_type: 'number'
                }
            },
            {
                column: "display_name",
                width: '15%',
                header: __('m_users_backend_full_name'),
                link: '/admin/users/{id}',
                filter: {
                    data_type: 'string'
                }
            },
            {
                column: "user_login",
                width: '15%',
                header: __('m_users_backend_user_name'),
                filter: {
                    data_type: 'string'
                }
            },
            {
                column: "user_email",
                width: '15%',
                header: __('all_table_column_email'),
                filter: {
                    data_type: 'string'
                }
            },
            {
                column: "phone",
                width: '12%',
                header: __('all_table_column_phone'),
                filter: {
                    data_type: 'string'
                }
            },
            {
                column: "role.name",
                width: '10%',
                header: __('all_table_column_role'),
                link: '/admin/roles/{role.id}',
                filter: {
                    type: 'select',
                    filter_key: 'role_id',
                    data_source: 'role', // name of models (in older version is name of table)
                    display_key: 'name',
                    value_key: 'id'
                }
            },
            {
                column: "user_status",
                width: '10%',
                header: __('all_table_column_status'),
                filter: {
                    type: 'select',
                    filter_key: 'user_status',
                    data_source: [
                        {
                            name: "publish"
                        },
                        {
                            name: "un-publish"
                        }
                    ],
                    display_key: 'name',
                    value_key: 'name'
                }
            }
        ];

        // Config columns
        let filter = createFilter(req, res, tableStructure,{
            button : {
                searchButton : "users",
                createButton : '/admin/users/create',
                resetFilterButton : '/admin/users'
            },
            rootLink : '/admin/users/page/$page/sort',
            itemOfPage : 10
        });

        // List users
        app.models.user.findAndCountAll({
            attributes: filter.attributes,
            include: [
                {
                    model: app.models.role
                }
            ],
            order: filter.order,
            limit: filter.limit,
            offset: filter.offset,
            where: filter.conditions
        }).then(function (results) {
            let totalPage = Math.ceil(results.count / itemOfPage);

            res.backend.render('index', {
                title: __('m_users_backend_controllers_index_list'),
                items: results.rows,
                totalPage: totalPage
            });

        }).catch(function (error) {
            _log.error(error);
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
            res.backend.render('index', {
                title: __('m_users_backend_controllers_index_list'),
                totalPage: 1,
                items: null
            });
        });
    };

    controller.view = function (req, res) {
        // Add button
        res.locals.user = req.user;// Add locals user for view or get infomation of user
        let back_link = '/admin/users';
        let search_params = req.session.search;
        if (search_params && search_params[route + '_index_list']) {
            back_link = '/admin' + search_params[route + '_index_list'];
        }
        res.locals.backButton = back_link;//acl.addButton(req, route, 'index', back_link);
        res.locals.saveButton = 'update';//acl.addButton(req, route, 'update');

        // Get user by session and list roles
        app.models.role.findAll().then(function (roles) {
            res.backend.render( edit_template, {
                title: __('m_users_backend_controllers_index_update'),
                roles: roles,
                item: req.user,
                id: req.params.uid
            });
        }).catch(function (err) {
            _log.error(err);
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
            res.backend.render( edit_template, {
                title: __('m_users_backend_controllers_index_update'),
                roles: null,
                item: null,
                id: 0
            });
        });
    };

    controller.course_of = function (req, res) {
        res.locals.user = req.user;// Add locals user for view or get infomation of user
        let email = req.params.email;
        app.models.customer_register.findAll({
            include: [{
                model: app.models.course, attributes: [
                    'title'
                ]
            }],
            where: {
                email: email
            },
            attributes: ['full_name', 'email', 'register_date']
        }).then(function (results) {
            res.json(results);
        }).catch(function (err) {
            req.flash.error("Error: ", err.stack);
        })
    };

    controller.update = function (req, res, next) {
        let edit_user = null;
        let data = req.body;
        res.locals.user = req.user;// Add locals user for view or get infomation of user
         //Get user by id
        app.models.user.findById(req.params.uid).then(function (user) {
            edit_user = user;
            return new Promise(function (fulfill, reject) {
                if (data.base64 && data.base64 != '' && data.base64 != user.user_image_url) {
                    let fileName = folder_upload + slug(user.user_login).toLowerCase() + '.png';
                    let base64Data = data.base64.replace(/^data:image\/png;base64,/, "");

                    return writeFileAsync(__base + 'upload' + fileName, base64Data, 'base64').then(function () {
                        data.user_image_url = fileName;
                        fulfill(data);
                    }).catch(function (err) {
                        reject(err);
                    });
                } else fulfill(data);
            })
        }).then(function (data) {
            return edit_user.updateAttributes(data).then(function (result) {
                req.flash.success(__('m_users_backend_controllers_index_update_flash_success'));
                if (req.url.indexOf('profile') !== -1) {
                    redis.del(req.user.key, function (err, reply) {
                        if (!err)
                            app.models.user.find({
                                include: [app.models.role],
                                where: {
                                    id: result.id
                                }
                            }).then(function (user) {
                                let user_tmp = JSON.parse(JSON.stringify(user));
                                user_tmp.key = redisPrefix + 'current-user-' + user.id;
                                user_tmp.acl = JSON.parse(user_tmp.role.rules);
                                redis.setex(user_tmp.key, 300, JSON.stringify(user_tmp));
                            }).catch(function (error) {
                                console.log(error.stack);
                            });
                    });
                    return res.redirect('/' + adminPrefix + '/users/profile/' + req.params.uid);
                }
                return res.redirect('/' + adminPrefix + '/users/' + req.params.uid);
            });
        }).catch(function (error) {
            if (error.name == 'SequelizeUniqueConstraintError') {
                req.flash.error(__('m_users_backend_controllers_index_flash_email_exist'));
                return next();
            } else {
                req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
                return next();
            }
        });
    };

    controller.create = function (req, res) {
        // Add button
        res.locals.user = req.user; // Add locals user for view or get infomation of user
        let back_link = '/admin/users';
        let search_params = req.session.search;
        if (search_params && search_params[route + '_index_list']) {
            back_link = '/admin' + search_params[route + '_index_list'];
        }
        res.locals.backButton =  back_link;
        res.locals.saveButton =  'create';

         //Get list roles
        app.models.role.findAll({
            order: "id asc"
        }).then(function (roles) {
            res.backend.render(edit_template, {
                title: __('m_users_backend_controllers_index_add_user'),
                roles: roles
            });
        }).catch(function (error) {
            _log.error(error);
            req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
            res.backend.render( edit_template, {
                title: __('m_users_backend_controllers_index_add_user'),
                roles: null
            });
        });
    };

    controller.save = function (req, res, next) {
        res.locals.user = req.user;// Add locals user for view or get infomation of user
        let back_link = '/admin/users';
        let search_params = req.session.search;
        if (search_params && search_params[route + '_index_list']) {
            back_link = '/admin' + search_params[route + '_index_list'];
        }
        // Get form data
        var data = req.body;

        if (!data.role_ids){
            console.log('DATA : ',JSON.stringify(data,null,3));
        }

        return new Promise(function (fulfill, reject) {
            if (data.base64 && data.base64 != '') {
                let fileName = folder_upload + slug(data.user_login).toLowerCase() + '.png';
                let base64Data = data.base64.replace(/^data:image\/png;base64,/, "");

                return writeFileAsync(__base + 'upload' + fileName, base64Data, 'base64').then(function () {
                    data.user_image_url = fileName;
                    fulfill(data);
                }).catch(function (err) {
                    reject(err);
                });
            } else fulfill(data);
        }).then(function (data) {
                app.models.user.create(data).then(function (user) {
                    req.flash.success(__('m_users_backend_controllers_index_add_flash_success'));
                    res.locals.title = __('m_users_backend_controllers_index_list');
                    res.redirect(back_link);
                }).catch(function (error) {
                    res.locals.backButton =  back_link;
                    res.locals.saveButton =  'create';
                    if (error.name == 'SequelizeUniqueConstraintError') {
                        res.locals.title = __('m_users_backend_controllers_index_update');
                        req.flash.error(__('m_users_backend_controllers_index_flash_email_exist'));
                        res.redirect(back_link);
                    } else {
                        req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
                        res.backend.render(edit_template,{user:data,create : 'true',title: __('m_users_backend_controllers_index_update')});
                    }
                });
            }).catch(function (error) {
                req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
                res.locals.backButton =  back_link;
                res.locals.saveButton =  'create';
                res.backend.render(edit_template,{
                    title: __('m_users_backend_controllers_index_update'),
                    item : data,
                    create : true
                });
            })
    };

    controller.delete = function (req, res) {
        res.locals.user = req.user;// Add locals user for view or get infomation of user
        // Check delete current user
        let ids = req.body.ids;
        let id = req.user.id;
        let index = ids.indexOf(id);

        // Delete user
        if (index == -1) {
            app.models.user.destroy({
                where: {
                    id: {
                        "in": ids.split(',')
                    }
                }
            }).then(function () {
                req.flash.success(__('m_users_backend_controllers_index_delete_flash_success'));
                res.sendStatus(204);
            }).catch(function (error) {
                req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
                res.sendStatus(200);
            });
        } else {
            req.flash.warning(__('m_users_backend_controllers_index_delete_flash_success'));
            res.sendStatus(200);
        }
    };
    /**
     * Profile
     */
    controller.profile = function (req, res) {
        res.locals.user = req.user;// Add locals user for view or get infomation of user
        // Add button
        //console.log('profile : ',JSON.stringify(req.user,null,3));
        let role_ids = [];
        if(!req.user.role_ids) role_ids.push(req.user.role_id);
        else role_ids = req.user.role_ids.split(/\D/);
        app.models.role.findAll({
            where :{
                id : {
                    $in : role_ids
                }
            }
        }).then(function (roles) {
            //console.log(JSON.stringify(roles,null,2));
            res.locals.backButton = '/admin'
            res.locals.saveButton = 'save';
            res.backend.render('new', {
                item: req.user,
                role_ids: roles
            });
        })

    };
    /**
     * Get Avatar library
     */
    controller.getAvatarGallery = function (req, res) {
        readdirAsync(__base + 'upload/avatar-gallery').then(function (files) {
            res.json(files);
        }).catch(function (err) {
            res.status(500).send(err.stack);
        })
    };

    /**
     * Change pass view
     */


    controller.changePass = function (req, res) {
        res.locals.backButton = '/admin/users';
        res.locals.user = req.user;
        res.backend.render('change-pass', {
            title : "Change User's password",
            item: req.user
        });
    };

    /**
     * Update pass view
     */
    controller.updatePass = function (req, res) {
        res.locals.user = req.user;// Add locals user for view or get infomation of user
        res.locals.backButton = '/admin/users';
        let old_pass = req.body.old_pass;
        let user_pass = req.body.user_pass;

        app.models.user.findById(req.user.id).then(function (user) {
            if (user.authenticate(old_pass)) {
                user.updateAttributes({
                    user_pass: user.hashPassword(user_pass)
                }).then(function () {
                    req.flash.success(__('m_users_backend_controllers_index_update_pass_flash_success'));
                }).catch(function (error) {
                    req.flash.error('Name: ' + error.name + '<br />' + 'Message: ' + error.message);
                }).finally(function () {
                    res.backend.render('change-pass');
                });
            } else {
                req.flash.warning(__('m_users_backend_controllers_index_update_pass_flash_error'));
                res.backend.render(req, res, 'change-pass');
            }
        });
    };

    controller.saveOAuthUserProfile = function (req, profile, done) {
        app.models.user.find({
            where: {
                user_email: profile.user_email
            }
        }).then(function (user) {
            if (user) {
                return done(null, user);
            } else {
                app.models.user.create(profile).then(function (user) {
                    return done(null, user);
                })
            }
        })
    };

    controller.userById = function (req, res, next, id) {
        app.models.user.find({
            include: [
                {
                    model: app.models.role
                }
            ],
            where: {
                id: id
            },
            raw : true
        }).then(function (user) {
            req.user = user;
            next();
        }).catch(function (err) {
            console.log('ERROR : '+err);
        })
    };

    controller.hasAuthorization = function (req, res, next) {
        if (req.user.id !== req.user.id) {
            return false;
        }
        return true;
    };

}