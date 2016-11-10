var multiSelect = (function(selector, options) {
    "use strict";

    // Gibt es keinen Selector, gibt es kein Plugin.
    if (!checkType(selector, 'String') || !selector.trim())
        return;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // EINSTELLUNGEN ------------------------------------------------------------------------------------------------ //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var settings = {
        searchBar: false,
        useOptGroups: true,
        ofString: 'of',
        cancelString: 'CANCEL',
        saveString: 'SAVE',

        // Hooks
        preInit: null,
        afterInit: null,
        onChange: null,
        onSave: null,
    };

    // Die übergebenen Optionen überschreiben die Standard-Settings
    if (typeof options !== 'undefined')
        for (var property in options)
            if (options.hasOwnProperty(property))
                settings[property] = options[property];

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // NÜTZLICHE FUNKTIONEN ----------------------------------------------------------------------------------------- //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Eigener Exception-Type
    function MultiSelectException(message) {
        this.message = message;
        this.name    = 'MultiSelectException';
    }

    // Holt sich den Typen aus Sicht der toString()-Methode der Objekte in JavaScript
    function getType(value) {
        return Object.prototype.toString.call(value).replace('[object ', '').replace(']', '');
    }

    function checkType(value, types) {
        types = types.split('|');

        for (var i in types)
            if (getType(value) === types[i])
                return true;

        return false;
    }

    function uniqid() {
        return Math.floor(Math.random() * 1000000) + (new Date().getTime()).toString(16);
    }

    // Erstellt ein HTML-Element
    function createElement(leftTag, content, rightTag) {
        var element = document.createElement('div');

        var tmp = '<' + leftTag + '>';

        if (typeof rightTag !== 'undefined')
            tmp += content + '</' + rightTag + '>';

        element.innerHTML = tmp;

        return element;
    }

    // Wartet bis der Inhalt der Seite geladen ist bevor der Code ausgeführt wird
    function ready(fn) {
        if (document.readyState != 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // DYNAMISCHE FUNKTIONEN (GETTER, SETTER, ADDER) ---------------------------------------------------------------- //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var get = function(that, what) {
        if (typeof that[what] === 'undefined')
            throw new MultiSelectException('get: param 0: no defined value to get');

        switch (true) {
            // Objekt
            case that[what].type == 'Object' && !checkType(that[what].value, 'Array'):
                var retVal = {};

                for (var property in that[what].value)
                    if (that[what].value.hasOwnProperty(property))
                        retVal[property] = that[what].value[property];

                return retVal;
            case that[what].type == 'Object' && checkType(that[what].value, 'Array'):
            case 'Array': return that[what].value.slice();
            default:      return that[what].value;
        }
    }

    var set = function(that, what, value) {
        if (typeof that[what] === 'undefined')
            throw new MultiSelectException('set: param 0: "' + what + '" is not defined');

        if (!checkType(value, that[what].type))
            throw new MultiSelectException('set: param 1 not typeof ' + that[what].type + ' (is ' + getType(value) + ')');

        if (typeof what === 'undefined')
            throw new MultiSelectException('set: param 0: no defined value to set');

        return (that[what].value = value);
    };

    var add = function(that, what, value) {
        if (typeof that[what] === 'undefined')
            throw new MultiSelectException('add: param 0: no defined value to add something');

        if (!checkType(that[what].value, 'Array'))
            throw new MultiSelectException('add: can\'t push value into a non-array');

        if (typeof value === 'undefined')
            throw new MultiSelectException('add: param 1: Can\'t push nothing into an array');

        if (!checkType(value, that[what].type))
            throw new MultiSelectException('add: param 1: wrong type');

        that[what].value.push(value);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // KLASSEN ------------------------------------------------------------------------------------------------------ //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var msOption = (function() {
        var _private = function() { 
            return {
                checked: { value: false, type: 'Boolean' },
                label: { value: '', type: 'String' },
                disabled: { value: false, type: 'Boolean' },
                isOptionGroup: { value: false, type: 'Boolean' },
                options: { value: [], type: 'Object', className: 'Option' },
                domElement: { value: null, type: 'HTMLOptGroupElement|HTMLOptGroupElement|HTMLOptionElement' },
            };
        };

        var _privateVals = [];

        function msOption(element) {
            this.className = 'Option';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof element !== 'undefined')
                this.set('domElement', element);
        };

        // Dynamic get/set/add
        msOption.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        msOption.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        msOption.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        msOption.prototype.inheritFromElement = function() {
            var element = this.get('domElement');

            if (element === null)
                return;

            this.set('label', this.get('isOptionGroup')
                ? element.getAttribute('label')
                : element.textContent);

            this.set('disabled', element.disabled)

            if (!this.get('isOptionGroup'))
                this.set('checked', element.selected);
        };

        return msOption;
    })();

    var Dropdown = (function() {
        var _private = function() {
            return{
                domElement: { value: null, type: 'HTMLBodyElement' },
            }
        };

        var _privateVals = [];

        function Dropdown() {
            this.className = 'Dropdown';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();
        };

        // Dynamic get/set
        Dropdown.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        Dropdown.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };

        Dropdown.prototype.applyOptions = function() {

        };

        return Dropdown;
    })();

    var ToggleButton = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLSelectElement' },
                label: { value: null, type: 'String' },
            };
        };

        var _privateVals = [];

        function ToggleButton(element, label) {
            this.className = 'ToggleButton';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof element !== 'undefined')
                this.set('domElement', element);

            if (typeof label !== 'undefined')
                this.set('label', label);
        };

        // Dynamic get/set/add
        ToggleButton.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        ToggleButton.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        ToggleButton.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        return ToggleButton;
    })();

    var UIController = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLSelectElement' },
                options: { value: [], type: 'Object', className: 'Option' },
                dropdown: { value: null, type: 'Object', className: 'Dropdown' },
                toggleButton: { value: null, type: 'Object', className: 'ToggleButton' },
                dropdownIsOpen: { value: false, type: 'Boolean' }
            };
        };

        var _privateVals = [];

        function UIController(element) {
            this.className = 'UIController';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof element !== 'undefined')
                this.set('domElement', element);

            this.init();
        };

        // Dynamic get/set/add
        UIController.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        UIController.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        UIController.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        UIController.prototype.init = function() {
            var that = this;

            var select  = this.get('domElement');
            var options = select.querySelectorAll('optgroup, option');

            var currentOptionGroup = null;

            Array.prototype.forEach.call(options, function(el, i) {
                if (!settings.useOptGroups && el.tagName === 'OPTGROUP')
                    return;

                var option = new msOption(el);

                option.set('isOptionGroup', el.tagName === 'OPTGROUP');

                if (option.get('isOptionGroup'))
                    currentOptionGroup = option;
                else if (currentOptionGroup !== null)
                    currentOptionGroup.add('options', option);

                option.inheritFromElement();

                that.add('options', option);
            });

            var toggleButton = new ToggleButton(select);
            this.set('toggleButton', toggleButton);

            var dropdown = new Dropdown();
        };

        return UIController;
    })();

    var MultiSelect = (function() {
        var _private = function() {
            return {
                uiControllers: { value: [], type: 'Object', className: 'UIController' },
                settings: { value: null, type: 'Object' },
            };
        };

        var _privateVals = [];

        function MultiSelect(settings) {
            this.className = 'MultiSelect';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();

            if (typeof settings !== 'undefined')
                this.set('settings', settings);
        };

        // Dynamic get/set/add
        MultiSelect.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        MultiSelect.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };
        MultiSelect.prototype.add = function(what, value) { return add(_privateVals[this.instanceId], what, value) };

        MultiSelect.prototype.init = function(selector) {
            var that = this;

            var selects = document.querySelectorAll(selector);

            if (!selects.length)
                throw new MultiSelectException('init: No Selects could be found');

            Array.prototype.forEach.call(selects, function(select, i){
                var uiController = new UIController(select);
                that.add('uiControllers', uiController);
            });
        };

        return MultiSelect;
    })();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ANWENDUNG ---------------------------------------------------------------------------------------------------- //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var multiSelect = new MultiSelect(settings);

    // Warten bis der Inhalt der Seite geladen ist
    ready(function() {
        multiSelect.init(selector);
    });
});