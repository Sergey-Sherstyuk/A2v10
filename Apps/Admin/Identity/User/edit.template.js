﻿
/* identity/user template */

const template = {
    properties: {
    },
    events: {
        "User.Groups[].adding": onAdding
    },
    validators: {
        "User.Name": [
            "Не вказано логін",
            { valid: duplicateLogin, async: true, msg: "Користувач за таким логіном вже існує" }
        ],
        "User.Email": { valid:'email', msg: 'Помилкова адреса электронної пошти'}
    },
    commands: {

    }
};

module.exports = template;

function onAdding(array, elem) {
    if (array.find(item => item.Id === elem.Id))
        return false; // такая группа уже есть
    return true;
}

function duplicateLogin(user, value) {
    // this === rule ???
    var vm = user.$vm;
    if (!user.Name)
        return true;
    return vm.$asyncValid('duplicateLogin', { Login: user.Name, Id: user.Id });
}
