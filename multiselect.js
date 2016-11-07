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
    // NÜTZLCIHE FUNKTIONEN ----------------------------------------------------------------------------------------- //
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

    function checkType(value, type) {
        return getType(value) === type;
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

    var get = function(what) {
        if (typeof this[what] === 'undefined')
            throw new MultiSelectException('get: param 0: no defined value to get');

        switch (true) {
            // Objekt
            case this[what].type == 'Object' && !checkType(this[what].value, 'Array'):
                var retVal = {};

                for (var property in this[what].value)
                    if (this[what].value.hasOwnProperty(property))
                        retVal[property] = this[what].value[property];

                return retVal;
            case this[what].type == 'Object' && checkType(this[what].value, 'Array'):
            case 'Array': return this[what].value.slice();
            default:      return this[what].value;
        }
    }

    var set = function(what, value) {
        if (typeof this[what] === 'undefined')
            throw new MultiSelectException('get: param 0: no defined value to set');

        var inType = true;

        for (var i in this[what].type)

        if (!checkType(value, this[what].type))
            throw new MultiSelectException('set: param 1 not typeof ' + this[what].type + ' (is ' + getType(value) + ')');

        if (typeof what === 'undefined')
            throw new MultiSelectException('set: param 0: no defined value to set');

        this[what].value = value;
    };

    var add = function(what, value) {
        if (typeof this[what] === 'undefined')
            throw new MultiSelectException('add: param 0: no defined value to add something');

        if (!checkType(this[what].value, 'Array'))
            throw new MultiSelectException('add: can\'t push value into a non-array');

        if (typeof value === 'undefined')
            throw new MultiSelectException('add: param 1: Can\'t push nothing into an array');

        if (!checkType(value, this[what].type))
            throw new MultiSelectException('add: param 1: wrong type');

        this[what].value.push(value);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // KLASSEN ------------------------------------------------------------------------------------------------------ //
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var msOption = (function() {
        function msOption(element) {
            this.className = 'Option';

            // Private Variables
            var _private = {
                checked: { value: false, type: 'Boolean' },
                label: { value: '', type: 'String' },
                disabled: { value: false, type: 'Boolean' },
                isOptionGroup: { value: false, type: 'Boolean' },
                options: { value: [], type: 'Object', className: 'Option' },
                domElement: { value: null, type: 'HTMLOptGroupElement|HTMLOptGroupElement' },
            };

            // Dynamic Values
            this.set = set.bind(_private);
            this.add = add.bind(_private);
            this.get = get.bind(_private);

            // construct param
            if (typeof element !== 'undefined')
                this.set('domElement', element);
        };

        return msOption;
    })();

    var Dropdown = (function() {
        function Dropdown(element) {
            this.className = 'Dropdown';

            // Private Variables
            var _private = {
                domElement: { value: null, type: 'HTMLBodyElement' },
            };

            // Dynamic Values
            this.set = set.bind(_private);
            this.get = get.bind(_private);

            // construct param
            if (typeof element !== 'undefined')
                this.set('domElement', element);
        };

        return Dropdown;
    })();

    var ToggleButton = (function() {
        function ToggleButton(element, label) {
            this.className = 'ToggleButton';

            // Private Variables
            var _private = {
                domElement: { value: null, type: 'HTMLBodyElement' },
                label: { value: null, type: 'String' },
            };

            // Dynamic Values
            this.set = set.bind(_private);
            this.get = get.bind(_private);

            // construct params
            if (typeof element !== 'undefined')
                this.set('domElement', element);

            if (typeof label !== 'undefined')
                this.set('label', label);
        };

        return ToggleButton;
    })();

    var UIController = (function() {
        function UIController(element) {
            this.className = 'UIController';

            // Private Variables
            var _private = {
                domElement: { value: null, type: 'HTMLSelectElement' },
                options: { value: [], type: 'Object', className: 'Option' },
                dropdown: { value: null, type: 'Object', className: 'Dropdown' },
                togglebutton: { value: null, type: 'Object', className: 'ToggleButton' },
                dropdownIsOpen: { value: false, type: 'Boolean' }
            };

            // Dynamic Values
            this.set = set.bind(_private);
            this.add = add.bind(_private);
            this.get = get.bind(_private);

            // construct param
            if (typeof element !== 'undefined')
                this.set('domElement', element);

            this.init();
        };

        UIController.prototype.init = function() {
            var that = this;

            var select  = this.get('domElement');
            var options = select.querySelectorAll('optgroup, option');

            var currentOptionGroup = null;

            Array.prototype.forEach.call(options, function(el, i) {
                if (!settings.useOptGroups && el.tagName === 'OPTGROUP')
                    return;

                var option = new msOption(el);

                if (option.get('isOptionGroup'))
                    currentOptionGroup = option;
                else
                    currentOptionGroup.add('options', option);
            });
        };

        return UIController;
    })();

    var MultiSelect = (function() {
        function MultiSelect(settings) {
            this.className = 'MultiSelect';

            // Private Variables
            var _private = {
                uiControllers: { value: [], type: 'Object', className: 'UIController' },
                settings: { value: null, type: 'Object' },
            };

            // Dynamic Values
            this.set = set.bind(_private);
            this.add = add.bind(_private);
            this.get = get.bind(_private);

            if (typeof settings !== 'undefined')
                this.set('settings', settings);
        };

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

    ready(function() {
        multiSelect.init(selector);
    });

    return multiSelect;
});