"use strict";
let crypto = require('crypto');

module.exports = function (sequelize, DataTypes) {
    let User = sequelize.define("user", {
        id : {
            type : DataTypes.INTEGER,
            primaryKey : true,
            autoIncrement : true,
            validate : {
                isInt : {
                    msg : 'please input integer value'
                }
            }
        },
        user_login: {
            type : DataTypes.STRING(60),
            allowNull : false,
            unique : true,
            validate: {
                len : {
                    args : [1,60],
                    msg : 'please input not too long'
                },
                isName : function (value) {
                    if (typeof value !== 'string' || value.match(/[+-.,!@#$%^&*();\/|<>"'\\]/g)){
                        throw new Error('Please input valid value user_login');
                    }
                }
            }
        },
        user_pass: {
            type : DataTypes.STRING(255),
            allowNull : false,
            validate: {
                len : {
                    args : [6,255],
                    msg : 'Password must be greater than 6 characters'
                }
            }
        },
        user_email: {
            type : DataTypes.STRING(100),
            unique : true,
            validate : {
                isEmail: {
                    msg : 'Please input valid Email'
                }
            }
        },
        user_url: {
            type : DataTypes.STRING(100),
            allowNull: true
        },
        user_registered: {
            type : DataTypes.DATE,
            validate : {
                isDate : {
                    msg : 'Please input datetime value'
                }
            }
        },
        user_activation_key: {
            type : DataTypes.STRING(60),
            validate : {
                len : {
                    args : [0,60],
                    msg : 'Please don\'t input too long'
                }
            }
        },
        user_status: {
            type : DataTypes.STRING(15),
            validate : {
                isIn : {
                    args : [['publish', 'un-publish']],
                    msg : 'Please only input publish or un-publish'
                }
            }
        },
        display_name: {
            type : DataTypes.STRING(250),
            validate : {
                len : {
                    args : [0,250],
                    msg : 'Please don\'t input too long'
                }
            }
        },
        phone: {
            type : DataTypes.STRING,
            validate : {
                isNumber : function (val) {
                    if (!val.match(/[0-9]{3,}/g)){
                        throw new Error('Please input valid user\'s phone');
                    }
                }
            }
        },
        user_image_url: {
            type : DataTypes.TEXT
        },
        salt: {
            type : DataTypes.STRING(255),
            validate : {
                len : {
                    args : [0,255],
                    msg : 'please input salt not too long'
                }
            }
        },
        role_id: {
            type : DataTypes.INTEGER,
            validate : {
                isInt : {
                    msg : 'please input integer value role_id'
                }
            },
            set : function (val) {
                let roleIds = this.getDataValue('role_ids');
                let flag = false;
                if (roleIds)
                roleIds.split(',').forEach(function (v) {
                    if (val === v)
                        flag = true;
                })
                if(flag)
                    this.setDataValue('role_id',val);
                else
                    this.setDataValue('role_id',0);
            }
        },
        role_ids: {
            type : DataTypes.TEXT,
            defaultValue : '{0}',
            set : function (val) {
                let value = val.toString().split(',')
                let temp = '';
                let flag = false;
                let role_id_value = this.getDataValue('role_id');
                value.forEach(function (v) {
                    if(temp.length>0) temp+=','+v;
                    else temp+=v;
                    if(v == role_id_value) flag=true;
                })
                if(!flag) this.setDataValue('role_id',Number(value[0]));
                this.setDataValue('role_ids',temp);
            }
        },
        reset_password_expires: {
            type : DataTypes.BIGINT
        },
        reset_password_token: {
            type : DataTypes.STRING
        }
    }, {
        timestamps: false,
        tableName: 'arr_user',
        instanceMethods: {
            authenticate: function (password) {
                return this.user_pass === this.hashPassword(password);
            },
            hashPassword: function (password) {
                if (this.salt && password) {
                    return crypto.pbkdf2Sync(password, this.salt, 10000, 64).toString('base64');
                } else {
                    return password;
                }
            }
        },
        hooks: {
            beforeCreate: function (user, op, fn) {
                user.salt = randomid(50);
                user.user_pass = user.hashPassword(user.user_pass);
                fn(null, user);
            }
        }
    });
    User.sync();
    return User;
};

let randomid = function (length) {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
};