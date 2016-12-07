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
        postInit: null,
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
        return Object.prototype.toString.call(value).replace(/^\[object (.+)\]$/, '$1');
    }

    // Überprüft den Typen eines Wertes, kann über "|" aufgetrennt werden falls mehrere Werte abgefragt werden
    function checkType(value, types) {
        types = types.split('|');

        for (var i in types)
            if (getType(value) === types[i])
                return true;

        return false;
    }

    // Erstellt eine unique-id für die Instanzen
    function uniqid() {
        return Math.floor(Math.random() * 1000000) + (new Date().getTime()).toString(16);
    }

    // Erstellt ein HTML-Element
    function createElement(innerHTML, events) {
        var element = document.createElement('div');
        element.innerHTML = innerHTML;

        var child = element.children[0];

        if (typeof events !== undefined)
            for (var on in events)
                if (events.hasOwnProperty(on))
                    child.addEventListener(on, event);

        return child;
    }

    // Triggert ein natives Event
    function triggerEvent(element, eventName) {
        var event = document.createEvent('HTMLEvents');
        event.initEvent(eventName, true, false);
        element.dispatchEvent(event);
    }

    // Wartet bis der Inhalt der Seite geladen ist bevor der Code ausgeführt wird
    function ready(fn) {
        document.readyState != 'loading' && fn() || document.addEventListener('DOMContentLoaded', fn);
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
                var retVal = that[what].hasOwnProperty('className')
                    ? (that[what].value && new that[what].value.constructor || null)
                    : null;

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
                parentOption: { value: null, type: 'Object', className: 'Option' },
                domElement: { value: null, type: 'HTMLOptGroupElement|HTMLOptionElement|HTMLDivElement' },
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

        msOption.prototype.getUi = function() {
            var ext = '-option';

            if (this.get('isOptionGroup'))
                ext = '-optgroup';
            else if (this.get('parentOption'))
                ext += '-in-optgroup';

            var label = this.get('label');

            if (this.get('disabled'))
                label = '<i>' + label + '</i>';

            return this.set('domElement', createElement('<div class="multiselect-row multiselect' + ext + '">\
                <label>\
                    <input type="checkbox" class="multiselect-checkbox" data-opt-inst="' + this.instanceId + '" ' + (this.get('disabled') ? 'disabled' : '') + ' ' + (this.get('checked') ? 'checked' : '') + '> ' + label + '\
                </label>\
            </div>'));
        };

        msOption.prototype.check = function(checked) {
            var i, options;

            this.set('checked', checked);

            if (this.get('isOptionGroup')) {
                options = this.get('options');

                for (i in options)
                    if (!options[i].get('disabled'))
                        options[i].set('checked', checked);
            } else {
                var parent = this.get('parentOption');

                if (!parent)
                    return;

                options = parent.get('options');

                var allSelected = true;

                for (i in options)
                    if (!options[i].get('checked') && !options[i].get('disabled'))
                        allSelected = false;

                parent.set('checked', allSelected);
            }
        };

        return msOption;
    })();

    var Dropdown = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLDivElement' },
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

        Dropdown.prototype.getUi = function() {
            return this.set('domElement', createElement('<div class="multiselect-container">\
                <div class="multiselect-row-container"></div>\
                <div class="multiselect-row multiselect-row-bottom">\
                    <span class="multiselect-counter"></span>\
                    <span class="multiselect-button multiselect-save">SPEICHERN</span>\
                    <span class="multiselect-button multiselect-cancel">ABBRECHEN</span>\
                </div>\
            </div>'));
        };

        Dropdown.prototype.show = function() {
            this.get('domElement').classList = 'multiselect-container show';
        };

        Dropdown.prototype.hide = function() {
            this.get('domElement').classList = 'multiselect-container';
        };

        return Dropdown;
    })();

    var ToggleButton = (function() {
        var _private = function() {
            return {
                domElement: { value: null, type: 'HTMLButtonElement' },
                label: { value: null, type: 'String' },
            };
        };

        var _privateVals = [];

        function ToggleButton() {
            this.className = 'ToggleButton';
            this.instanceId = uniqid();

            _privateVals[this.instanceId] = _private();
        };

        // Dynamic get/set/add
        ToggleButton.prototype.get = function(what) { return get(_privateVals[this.instanceId], what) };
        ToggleButton.prototype.set = function(what, value) { return set(_privateVals[this.instanceId], what, value) };

        ToggleButton.prototype.getUi = function() {
            return this.set('domElement', createElement('<button class="multiselect-button multiselect-save multiselect-toggle"></button>'));
        };

        ToggleButton.prototype.setLabel = function(text) {
            this.get('domElement').innerHTML = text;
        };

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

            if (typeof element !== 'undefined') {
                this.set('domElement', element);
                this.init();
            }
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
                else if (currentOptionGroup !== null) {

                    currentOptionGroup.add('options', option);
                    option.set('parentOption', currentOptionGroup);
                }

                option.inheritFromElement();

                if (currentOptionGroup && currentOptionGroup.get('disabled'))
                    option.set('disabled', true);

                that.add('options', option);
            });

            var toggleButton = new ToggleButton(select);
            this.set('toggleButton', toggleButton);

            var dropdown = new Dropdown();
            this.set('dropdown', dropdown);

            this.allocAndReplace(select);
        };

        UIController.prototype.allocAndReplace = function(select) {
            var toggleButton = this.get('toggleButton');
            select.insertAdjacentHTML('afterend', toggleButton.getUi().outerHTML);

            var toggleButtonDOM = select.nextElementSibling;
            toggleButton.set('domElement', toggleButtonDOM);

            var dropdown = this.get('dropdown');
            toggleButtonDOM.insertAdjacentHTML('afterend', dropdown.getUi().outerHTML);

            var dropdownDOM = toggleButtonDOM.nextElementSibling;
            dropdown.set('domElement', dropdownDOM);

            select.parentNode.removeChild(select);

            toggleButtonDOM.setAttribute('data-inst', this.instanceId);
            dropdownDOM.setAttribute('data-inst', this.instanceId);

            this.updateContent();
        };

        UIController.prototype.updateContent = function() {
            var dropdownDOM  = this.get('dropdown').get('domElement');
            var toggleButtonDOM  = this.get('toggleButton').get('domElement');
            var rowContainer = dropdownDOM.querySelector('.multiselect-row-container');

            var optList = this.getOptionList();

            dropdownDOM.style = 'left: ' + toggleButtonDOM.offsetLeft + 'px; top: ' + (toggleButtonDOM.offsetTop + toggleButtonDOM.offsetHeight + 8) + 'px;';

            rowContainer.innerHTML = '';

            for (var i in optList)
                rowContainer.appendChild(optList[i]);

            var toggleButton = this.get('toggleButton');
            var rowCounter   = dropdownDOM.querySelector('.multiselect-counter');
            var counterText  = this.getSelectedOptionCount() + ' von ' + this.getOptionCount();

            toggleButton.setLabel(counterText + ' ausgewählt');
            rowCounter.innerHTML = counterText;

            this.handleIndeterminate();
        };

        UIController.prototype.handleIndeterminate = function() {
            var controllerOptions = this.get('options');

            for (var j in controllerOptions) {
                if (!controllerOptions[j].get('isOptionGroup'))
                    continue;

                var options = controllerOptions[j].get('options');

                var allSelected    = true;
                var allNotSelected = true;

                for (var i in options) {;
                    if (options[i].get('checked'))
                        allNotSelected = false;

                    if (!options[i].get('checked'))
                        allSelected = false;
                }

                if (!allSelected && !allNotSelected)
                    controllerOptions[j].get('domElement').querySelector('input[type=checkbox]').indeterminate = true;
            }
        }

        UIController.prototype.getOptionList = function() {
            var retVal  = [];

            var options = this.get('options');

            for (var i in options)
                retVal.push(options[i].getUi());

            return retVal;
        };

        UIController.prototype.getSelectedOptionCount = function() {
            var count = 0;

            var options = this.get('options');

            for (var i in options)
                if (options[i].get('checked') && !options[i].get('isOptionGroup'))
                    count++;

            return count;
        };

        UIController.prototype.getOptionCount = function() {
            var count = 0;

            var options = this.get('options');

            for (var i in options)
                if (!options[i].get('isOptionGroup'))
                    count++;

            return count;
        };

        UIController.prototype.handleCheckboxClick = function(el) {
            var instanceId = 'data-opt-inst' in el.attributes && el.attributes['data-opt-inst'].value || null;

            // obligatorisch
            if (!instanceId) {
                this.updateContent();
                return;
            }

            var opt = new msOption();
            opt.instanceId = instanceId;

            opt.check(el.checked);

            this.updateContent();
        };

        UIController.prototype.showDropdown = function() {
            this.set('dropdownIsOpen', true);
            this.get('dropdown').show();
            this.updateContent();
        };

        UIController.prototype.hideDropdown = function() {
            this.set('dropdownIsOpen', false);
            this.get('dropdown').hide();
        };

        UIController.prototype.saveChanges = function() {

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

        MultiSelect.prototype.applyEvents = function() {
            var i;
            var that = this;

            document.addEventListener('keydown', function(event) {
                if ((event.which || event.keyCode) !== 27) // Escape
                    return

                var uiControllers = that.get('uiControllers');

                for (i in uiControllers)
                    if (uiControllers[i].get('dropdownIsOpen'))
                        uiControllers[i].hideDropdown();
            });

            document.addEventListener('click', function(event) {
                var uiControllers = that.get('uiControllers');

                var el = event.target;

                var currentElement = el;
                var instanceId     = null;

                while (currentElement && !instanceId) {
                    instanceId = currentElement.attributes['data-inst'] && currentElement.attributes['data-inst'].value || null;
                    currentElement = currentElement.parentElement;
                }

                for (i in uiControllers)
                    if (uiControllers[i].get('dropdownIsOpen') && uiControllers[i].instanceId !== instanceId)
                        uiControllers[i].hideDropdown();

                if (!instanceId)
                    return;

                var ctrl = new UIController();

                ctrl.instanceId = instanceId;

                if (el.tagName == 'INPUT' && el.type == 'checkbox') {
                    ctrl.handleCheckboxClick(el);
                    return;
                }

                if (!!~el.className.indexOf('multiselect-button')) {
                    if (!!~el.className.indexOf('multiselect-cancel'))
                        ctrl.hideDropdown();
                    else if (!!~el.className.indexOf('multiselect-toggle')) { 
                        ctrl[(ctrl.get('dropdownIsOpen') ? 'hide' : 'show') + 'Dropdown']();
                    } else if (!!~el.className.indexOf('multiselect-save'))
                        ctrl.saveChanges();
                }

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
        multiSelect.applyEvents();
    });
})();
