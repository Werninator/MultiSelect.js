var multiSelect = (function(selector, options) {
    "use strict";

    function MultiSelectException(message) {
        this.message = message;
        this.name    = 'MultiSelectException';
    }

    function checkType(value, type) {

        return Object.prototype.toString.call(value) === '[object ' + type + ']';
    }

    var get = function(what) {
        if (typeof this[what] === 'undefined')
            throw new MultiSelectException('get: param 0: no defined value to set');

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
        if (!checkType(value, this[what].type))
            throw new MultiSelectException('set: param 1 not typeof ' + this[what].type);

        if (typeof what === 'undefined')
            throw new MultiSelectException('set: param 0: no defined value to set');

        this[what].value = value;
    };

    var add = function(what, value) {
        if (!checkType(this[what].value, 'Array'))
            throw new MultiSelectException('add: can\'t push value into a non-array');

        if (typeof value === 'undefined')
            throw new MultiSelectException('add: param 1: Can\'t push nothing into an array');

        if (!checkType(value, this[what].type))
            throw new MultiSelectException('add: param 1: wrong type');

        this[what].value.push(value);
    };

    var Option = (function() {
        function Option(element) {
            this.className = 'Option';

            // Private Variables
            var _private = {
                checked: { value: false, type: 'Boolean' },
                label: { value: '', type: 'String' },
                disabled: { value: false, type: 'Boolean' },
                isOptionGroup: { value: false, type: 'Boolean' },
                options: { value: [], type: 'Object', className: 'Option' },
                domElement: { value: null, type: 'HTMLBodyElement' },
            };

            // Dynamic Values
            this.set = set.bind(_private);
            this.add = add.bind(_private);
            this.get = get.bind(_private);

            // construct param
            if (typeof element !== 'undefined')
                this.set('domElement', element);
        };

        return Option;
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
        };

        return UIController;
    })();

    var MultiSelect = (function() {
        function MultiSelect(selector) {
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

            // construct param
            
        };

        return MultiSelect;
    })();

    if (!checkType(selector, 'String') || !selector.trim())
        return;

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

    if (checkType(options, 'Object'))
        for (var property in options)
            if (options.hasOwnProperty(property))
                settings[property] = options[property];

    // var elements = Array.prototype.slice.call(document.querySelectorAll(selector));
});