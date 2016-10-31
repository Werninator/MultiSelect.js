/**
 * @function    multiSelect
 * @description Native JS-Plugin for convienient use of <select multiple>-elements
 * @author      Patrick Werner (GitHub: @werninator)
 *
 * @param  {String} selector    Every element of selector will be iterated
 * @param  {Object} options     Overwrites the settings, access to hooks
 */
var multiSelect = (function(selector, options) {
    "use strict";

    ////////////////////////////
    // Catching faulty Inputs //
    ////////////////////////////

    if (typeof selector != 'string' || !selector.trim()) {
        console.error('[multipleSelect] Parameter 1 "selector" is not formatted correctly (%s).', selector);
        return;
    }

    if (typeof options != 'object')
        console.warn(
            '[multipleSelect] Parameter 2 "options" is not formatted correctly (%s). It will be ignored.',
            JSON.stringify(options)
        );

    /**
     * Settings for this plugin
     * @type {Object}
     */
    var settings = {
        /** @type {Boolean} Adds a searchbar to the interface */
        searchBar: false,

        /** @type {Boolean} Used to toggle the debug messages */
        debugMode: false,

        /** @type {Boolean} Indicator, if OptGroups will be used in the new interface */
        useOptGroups: true,

        /** @type {String} the string between the sum of the selected elements and max elements e.g. 'of' for '3 of 5' */
        ofString: 'of',

        /** @type {String} the string to cancel the actions you made before saving */
        cancelString: 'CANCEL',

        /** @type {String} the string to save the actions you made before saving */
        saveString: 'SAVE',

        // Hooks

        /**
         * Will be called before init method gets called
         * @type {function}
         */
        preInit: null,

        /**
         * Will be called after init method gets called
         * @type {function}
         */
        afterInit: null,

        /**
         * Will be called after init method gets called
         * @type {function}
         */
        onChange: null,

        /**
         * Will be called when changes will be saved
         * @type {function}
         */
        onSave: null,
    };

    ///////////////////////////////////////
    // Overwriting the option properties //
    ///////////////////////////////////////

    for (var property in options)
        if (options.hasOwnProperty(property))
            settings[property] = options[property];

    ///////////////////////////////////////////////////////////////////////////////////////////
    // Defining "classes" for optgroups and options, since they carry the information needed //
    ///////////////////////////////////////////////////////////////////////////////////////////

    var OptGroup = (function() {

        /**
         * Creates a new OptGroup
         * @class
         * @param {Object} name        Defines the label of the optgroup
         * @param {Object[]} options   Carries Options
         */
        function OptGroup(element, options) {
            this.element = element || null;

            if (element)
                this.name = this.element.attributes.getNamedItem('label').value;

            this.options = options || [];

            /**
             * Filters the options via object
             * @param  {Object} filters
             * @return {Object[]}
             */
            this.filterOptions = function(filters) {
                var filteredOptions = [];

                for (var i in this.options) {
                    var option = this.options[i];
                    var allFiltersApply = true;

                    for (var j in filters) {
                        var filter = filters[j];

                        if (!option.hasOwnProperty(j) || option[j] != filter) {
                            allFiltersApply = false;
                            break;
                        }
                    }

                    if (allFiltersApply)
                        filteredOptions.push(option);
                }

                return filteredOptions;
            };

            this.addOptionsOfElement = function() {
                if (!this.element)
                    return;

                for (var i = 0; i < this.element.children.length; i++)
                    this.addOption(new Option(this.element.children[i]));
            };

            /**
             * Adds an Option to the options array
             * @param {Object[]} option
             */
            this.addOption = function(option) {
                if (option.constructor.name != 'Option') {
                    console.warn('[multiSelect] Option cannot be added - it doesn\'t inherit the Option class');
                    return;
                }

                var similarOptions = this.filterOptions({
                    name: option.name,
                    value: option.value,
                    selected: option.selected,
                    disabled: option.disabled
                });

                if (similarOptions.length) {
                    console.warn(
                        '[multiSelect] It seems that a similar Option has been added already (Input: %s, Similar Options: %s)',
                        JSON.stringify(option),
                        JSON.stringify(similarOptions)
                    );
                    return;
                }

                this.options.push(option);
            };

            /**
             * Removes an option out of the options array
             * @param  {number|Object} param
             * @return {Boolean}       Indicator if object was removed successively
             */
            this.removeOption = function(param) {
                var index = null;

                switch (true) {
                    case typeof param == 'object' && param.constructor.name == 'Option':
                        index = this.options.indexOf(param);
                        break;
                    case typeof param == 'number':
                        index = param;
                        break;
                }

                if (typeof this.options[index] == 'undefined') {
                    console.warn(
                        '[multiSelect] Option with index `%s` can\'t be removed, since it does not exist',
                        index
                    );

                    return false;
                }

                this.options.splice(index, 1);

                return true;
            };
        }

        return OptGroup;
    })();

    var Option = (function() {
        /**
         * Creates a new Option
         * @class
         * @param {Object} element
         */
        function Option(element) {
            this.element = element || null;

            this.name  = this.element.textContent;
            this.value = (this.element.attributes.getNamedItem('value') || {}).value;
            this.selected = !!this.element.attributes.getNamedItem('selected');
            this.disabled = !!this.element.attributes.getNamedItem('disabled');
        }

        return Option;
    })();

    var Interface = (function() {
        /**
         * Creates a new Interface
         * @class
         */
        function Interface() {
            this.container = null;
            this.selectElements = [];
            this.counter = null;
            this.buttons = {save: null, cancel: null};
        }

        return Interface;
    })();

    ///////////////////////////////////////////////////////
    // Defining the methods used to let the magic happen //
    ///////////////////////////////////////////////////////

    /** @type {Object[]} Generated interfaces will be stored right here */
    var interfaces = [];

    /**
     * Collection of methods
     * @return {Object}
     */
    var methods = {
        /**
         * Initializes the multipleSelect for a DOMElement
         * @param  {Object} element
         * @return {Boolean}
         */
        init: (function(element) {
            if (typeof settings.preInit == 'function')
                settings.preInit();

            if (settings.debugMode) {
                console.group('init([element])');
                console.log('[element]:', element);
            }

            var data = this.parseData(element);

            if (!data) {
                console.groupEnd();
                return;
            }

            var dropdown = this.initializeInterface(element, data);
            this.addEventListeners(dropdown);

            console.groupEnd();

            if (typeof settings.afterInit == 'function')
                settings.afterInit();
        }),

        /**
         * Parses the data from the select-element given
         * @param  {String} element Select-Element
         * @return {Object[]}       OptGroups/Options as an array
         */
        parseData: (function(element) {
            if (settings.debugMode) {
                console.group('parseData([element])');
                console.log('[element]:', element);
            }

            if (element.tagName != 'SELECT') {
                if (settings.debugMode) {
                    console.warn('[multipleSelect] [element.tagName] is not "' + '%cSELECT' + '"', 'font-weight:bold');
                    console.warn('[element.tagName]: ' + '%c%s', 'font-weight:bold;', element.tagName);
                    console.groupEnd();
                }

                return false;
            }

            if (!element.options.length) {
                if (settings.debugMode) {
                    console.warn('[multipleSelect] Select has no options.');
                    console.groupEnd();
                }

                return false;
            }

            var data = [];
            var elements = settings.useOptGroups ? element.children : element.options;

            for (var i = 0; i < elements.length; i++) {
                var child = elements[i];

                switch (child.tagName) {
                    case 'OPTGROUP':
                        var optGroup = new OptGroup(child);

                        optGroup.addOptionsOfElement();

                        data.push(optGroup);
                        break;

                    case 'OPTION':
                        data.push(new Option(child));
                        break;
                }
            }

            return data;

            console.groupEnd();
        }),

        /**
         * Initializes the interface for the multiselect-dropdown and the trigger-button
         * @param  {Object} element target node which will be replaced with the plugin
         * @param  {Array} data     the accumulated data for the init of the interface
         * @return {Object}         returns an object of the Interface-Class
         */
        initializeInterface: (function(element, data) {
            if (!element || !data)
                return false;

            var intrface = new Interface();

            /////////////////////////////////////////////////
            // Adding Container next to the select-element //
            /////////////////////////////////////////////////

            var container = document.createElement('DIV');
            container.className = 'multiselect-container';

            element.parentNode.insertBefore(container, element.nextSibling);

            intrface.container = container;

            //////////////////////////////////////////
            // Adding the optgroups/options as rows //
            //////////////////////////////////////////

            for (var i in data) {
                var child = data[i];
                var row, label, rowCheckbox, rowChild;

                switch (child.constructor.name) {
                    case 'OptGroup':
                        row = document.createElement('DIV');
                        row.className = 'multiselect-row multiselect-optgroup';

                        container.appendChild(row);

                        intrface.selectElements.push(row);

                        label = document.createElement('LABEL');

                        row.appendChild(label);

                        rowCheckbox = document.createElement('INPUT');
                        rowCheckbox.type = 'checkbox';
                        rowCheckbox.className = 'multiselect-checkbox';

                        label.appendChild(rowCheckbox);

                        label.innerHTML += ' ' + child.name;

                        for (var j in child.options) {
                            var option = child.options[j];

                            row = document.createElement('DIV');
                            row.className = 'multiselect-row multiselect-option-in-optgroup';

                            container.appendChild(row);

                            intrface.selectElements.push(row);

                            label = document.createElement('LABEL');

                            row.appendChild(label);

                            rowCheckbox = document.createElement('INPUT');
                            rowCheckbox.type = 'checkbox';
                            rowCheckbox.className = 'multiselect-checkbox';

                            if (option.selected)
                                rowCheckbox.checked = true;

                            label.appendChild(rowCheckbox);

                            label.innerHTML += option.name;
                        }

                        break;
                    case 'Option':
                        row = document.createElement('DIV');
                        row.className = 'multiselect-row multiselect-option';

                        container.appendChild(row);

                        intrface.selectElements.push(row);

                        label = document.createElement('LABEL');

                        row.appendChild(label);

                        rowCheckbox = document.createElement('INPUT');
                        rowCheckbox.type = 'checkbox';
                        rowCheckbox.className = 'multiselect-checkbox';

                        if (child.selected)
                            rowCheckbox.checked = true;

                        label.appendChild(rowCheckbox);

                        label.innerHTML += child.name;
                        break;
                }
            }

            ///////////////////////
            // Adding bottom row //
            ///////////////////////

            var bottomRow = document.createElement('DIV');
            bottomRow.className = 'multiselect-row multiselect-row-bottom';

            container.appendChild(bottomRow);

            var counter = document.createElement('SPAN');
            counter.className = 'multiselect-counter';
            counter.innerHTML = 'COUNTER_TEXT';

            bottomRow.appendChild(counter);

            intrface.counter = counter;

            var buttonSave = document.createElement('SPAN');
            buttonSave.className = 'multiselect-button multiselect-save';
            buttonSave.innerHTML = settings.saveString || 'SAVE';

            bottomRow.appendChild(buttonSave);

            intrface.buttons.save = buttonSave;

            var buttonCancel = document.createElement('SPAN');
            buttonCancel.className = 'multiselect-button multiselect-cancel';
            buttonCancel.innerHTML = settings.cancelString || 'CANCEL';

            bottomRow.appendChild(buttonCancel);

            intrface.buttons.cancel = buttonCancel;

            return intrface;
        }),

        addEventListeners: (function(intrface) {
            // 2Do: Counter

            var countOptions = function(onlySelected) {
                onlySelected = typeof onlySelected == 'undefined' ? false : onlySelected;

                var count = 0;

                for (var i in intrface.selectElements) {
                    var element = intrface.selectElements[i];

                    if (!~element.className.indexOf('option'))
                        continue;

                    var checkBox = element.childNodes[0].childNodes[0];

                    if (onlySelected && !checkBox.checked)
                        continue;

                    count++;
                }

                return count;
            };

            var refreshCountString = function() {

            };

            // 2Do: OptGroup behaviour
            // 2Do: Save (+ Cancel after)
            // 2Do: Cancel
        }),
    };

    //////////////////////////////////
    // Iterate through the elements //
    //////////////////////////////////

    var elements = Array.prototype.slice.call(document.querySelectorAll(selector));

    for (var i = 0; i < elements.length; i++)
        methods.init(elements[i]);

    // DEBUG: I don't know if I want to share the methods with the crowd
    return methods;
});