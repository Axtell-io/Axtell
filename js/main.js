// Polyfills
import '@babel/polyfill';
import 'url-search-params-polyfill';
import 'element-dataset';

import tippy from 'tippy.js';

import KeyManager from "~/models/KeyManager";
import Normalize from "~/models/Normalize";
import Language from "~/models/Language";
import Theme from "~/models/Theme";
import Post from "~/models/Post";
import Data from "~/models/Data";
import Auth from "~/models/Auth";

import Request from "~/models/Request/Request";
import Leaderboard from "~/models/Request/Leaderboard";

import ErrorManager from "~/helpers/ErrorManager";

// Make global
const IS_DEBUG = false;
if (IS_DEBUG) {
    global.Normalize = Normalize;
    global.Language = Language;
    global.Theme = Theme;
    global.Post = Post;
    global.Data = Data;
    global.Auth = Auth;

    global.Request = Request;
    global.Leaderboard = Leaderboard;

    global.KeyManager = KeyManager;
    global.ForeignChildInteractor = require('~/interactors/ForeignChildInteractor').default;
    global.ForeignInteractor = require('~/interactors/ForeignInteractor').default;
}

global.ErrorManager = ErrorManager;


(function(done) {
    // Only need to be able to access DOM
    if (document.readyState !== 'loading') {
        done();
    } else {
        document.addEventListener("DOMContentLoaded", done);
        document.addEventListener("load", done);
    }
}(function(state) {
    // This ensures that we only load once
    return function() {
        if (state === false) {
            state = true;
            try {
                require("./ui");
            } catch(error) {
                ErrorManager.report(error);
            }
        }
    };
}(false)));

setTimeout(
    console.log.bind(console,
        "%cHi curious developer!%c\nDon't paste anything here that you aren't sure won't hack you.",
        'font-size: 3em; font-weight: bold',
        'font-size: 1em'
    )
);

tippy('.tooltip', {
    arrow: true,
    animateFill: false,
    duration: [150, 250],
    size: 'small'
});