function TruthTableIterator(vars){
    var iterations = Math.pow(2, vars.length);
    var index = 0;
    
    this.hasNext = function(){
        return index < iterations;
    }
    
    this.next = function(){
        var n = index;
        var symbol_values = {};
        for(var i = vars.length - 1; i >= 0; i--){
            symbol_values[vars[i]] = n & 1;
            n = n >> 1;
        }
        index++;
        return symbol_values;
    }
}



function MinTerm(covers, bit_length, is_dont_care){
    var that = this;
    this.covers = covers; // list of minterms (numbers) that this MinTerm covers (a joined MinTerm may cover multiple minterms)
    this.bits = new Array(bit_length); // the bit representation of the MinTerm ordered from lsb to msb (i.e. 7 = [001])
    this.is_dont_care = typeof(is_dont_care) == "undefined" ? false : is_dont_care;
    this.must_be_used = !is_dont_care; // when a pair of terms are joined, they no longer need to be used in the minimized function
    this.id = MinTerms.nextId();
    var number_of_ones = -1; // calculate this later
    
    this.toString = function(){
        return this.bits.toString();    
    }
    
    
    this.getNumberOfOnes = function(){
        if(number_of_ones == -1){
            number_of_ones = 0;
            for(var i = 0; i < this.bits.length; i++){
                if(this.bits[i] == 1)
                    number_of_ones++;
            }
        }
        return number_of_ones;
    }
    
    // determine if two MinTerms can be joined together (based on their bits). 
    // Returns the index of the difference if the terms can be joined, otherwise -1
    var canJoin = function(min_term){
        if(that === min_term) return -1; // can't join with itself
        if(that.bits.length == 1 && min_term.bits.length == 1) return -1; // can't join 0 and 1
        
        var index_of_diff = 0; // index were the difference occured
        
        for(var i = 0, differences = 0; i < that.bits.length; i++){
            var a = that.bits[i];
            var b = min_term.bits[i];
            
            // the _ *must* match up
            if(a == "_" && b != "_")
                return -1;
            if(b == "_" && a != "_")
                return -1;
            
            // found a difference
            if(a != b){
                differences++;
                index_of_diff = i;
            }
            
            // we got too many differences
            if(differences > 1)
                return -1;
        }
        
        // if they are the same, don't join
        if(differences == 0)
            return -1;
            
        //alert(this.toString() + "\n" + min_term.toString());
        return index_of_diff;
    }
        
    this.join = function(min_term){
        var index_of_diff = canJoin(min_term);
        if(index_of_diff == -1)
            return false;
        
        // build a new MinTerm that covers both terms
        var covers = this.covers.concat(min_term.covers);
        // its only a don't care if both the joined terms are don't cares
        var is_dont_care = this.is_dont_care && min_term.is_dont_care;
        var new_term = new MinTerm(covers, this.bits.length, is_dont_care);
        
        // set the bits of the new term
        for(var i = 0; i < bit_length; i++){
            new_term.bits[i] = this.bits[i];
            
            // mark the different bit
            if(i == index_of_diff)
                new_term.bits[i] = "_";
        }
        
        // flag the terms that were combined (they don't need to be used anymore)
        this.must_be_used = min_term.must_be_used = false;
        
        return new_term;
    }
    
    // determine if a minterm (m) is covered by this minterm
    this.coversMinTerm = function(m){
        for(var i = 0; i < this.covers.length; i++){
            if(m == this.covers[i])
                return true;
        }
        return false;
    }
    
    // construct the bit array
    var n = this.covers[0]; // build the bits array based on the first minterm covered
    for(var i = this.bits.length - 1, tmp = n, j = 0; i >= 0; i--){
        this.bits[j++] = tmp & 1;
        tmp = tmp >> 1;
    }
}

// MinTerm utilities
var MinTerms = {
    id : 0,
    nextId : function(){
        return this.id++;
    },
    
    // get the number of bits neccessary to store the largest min term or don't care
    getNormalizedBitLength : function(min_terms, dont_cares){
        var max = 1;
        for(var i = 0; i < min_terms.length; i++){
            if(min_terms[i] > max)
                max = min_terms[i];
        }
        for(var i = 0; i < dont_cares.length; i++){
            if(dont_cares[i] > max)
                max = dont_cares[i];
        }        
        
        return Math.ceil(Math.log(max+1)/Math.log(2))
    },
    
    // build a set of min terms using arrays of integers
    fromArray : function(min_terms, dont_cares){
        if(typeof(dont_cares) == "undefined")
            var dont_cares = [];
            
        var bit_length = this.getNormalizedBitLength(min_terms, dont_cares);    
        var terms = [];
        for(var i = 0; i < min_terms.length; i++){
            terms.push(new MinTerm([min_terms[i]], bit_length));
        }
        
        for(var i = 0; i < dont_cares.length; i++){
            terms.push(new MinTerm([dont_cares[i]], bit_length, true));    
        }
        
        return terms;
    },
    
    fromExpression : function(expr){
        var mins = [];
        var lexer = new BooleanExpressionLexer(expr);
        var vars = lexer.variables();
        var evaluator = Bool(lexer);
        for(var i = 0, iter = new TruthTableIterator(vars); iter.hasNext(); i++){
            var symbol_values = iter.next();
            if(evaluator.eval(symbol_values)){
                mins.push(i);
            }
        }
        return this.fromArray(mins);
    }
}

function BooleanFunction(min_terms){    
    this.findPrimeImplicants = function(){
        var groups = this.joinTerms();
        var terms = this.getRemainingTerms(groups);    
        return terms;
    }
        
    this.joinTerms = function(){
        var groups = [];
        groups.push(min_terms);    
        
        // foreach group (we start off with one group, but add groups as we go...)
        for(var i = 0; i < groups.length; i++){
            // categorize the group by the number of ones in each term
            var by_ones = {};
            var max_ones = 0; // keep track of this so we can skip the last group
            for(var j = 0; j < groups[i].length; j++){
                var ones = groups[i][j].getNumberOfOnes();
                // create list if it doesn't already exist
                if(!by_ones[ones])
                    by_ones[ones] = [];
                
                by_ones[ones].push(groups[i][j]);
                if(ones > max_ones)
                    max_ones = ones;
            }
            
            // build the next group using a hash table to avoid duplicate terms
            var next_group = {};
            var add_new_group = false;

            for(var ones_length in by_ones){
                ones_length = parseInt(ones_length, 10); // this saves us from stupid bugs
                var search_group = by_ones[ones_length+1];
                
                // skip the max group and the group with no group with 1 more 1
                if(ones_length == max_ones || !search_group) 
                    continue;
                    
                // for each term in the group
                for(var j = 0; j < by_ones[ones_length].length; j++){
                    var a_term = by_ones[ones_length][j];                        
                    // try to find a match if the search group
                    for(var k = 0; k < search_group.length; k++){
                        var b_term = search_group[k];
                        var new_term = a_term.join(b_term);
                        if(new_term){
                            // create the joined term and add it to the next group
                            next_group[new_term.toString()] = new_term;
                            add_new_group = true;
                        }
                    }                    
                }            
            }
            
            // add the new group
            if(add_new_group){
                groups.push([]);                        
                for(var k in next_group)
                    groups[i+1].push(next_group[k]);
            }
        }
        return groups;
    }
        
    this.getRemainingTerms = function(groups){
        var remaining_terms = {}; // using a hash table to eliminate duplicates
        // go through each group
        for(var i = 0; i < groups.length; i++){
            // go through each term in the group
            for(j = 0; j < groups[i].length; j++){
                var term = groups[i][j]
                // is it essential?
                if(!term.is_dont_care && term.must_be_used)
                    remaining_terms[term.toString()] = term;
            }
        }
        
        // we have all the essential terms (in a hash table). Convert it to an array
        var terms = [];
        for(var k in remaining_terms){
            terms.push(remaining_terms[k]);
            //alert(essential_terms[k].bits.toString());
        }
        return terms;
    }
    
    this.getMinTerms = function(){
        return min_terms;    
    }
    
    this.isMinTerm = function(n){
        for(var i = 0;     i < min_terms.length; i++){
            if(min_terms[i].covers[0] == n)
                return true;
        }
        return false;
    }
    
    this.getNumberOfVars = function(){
        var max = 1;
        for(var i = 0; i < min_terms.length; i++){
            if(min_terms[i].covers[0] > max)
                max = min_terms[i].covers[0];
        }
        return Math.log(max)/Math.log(2) + 1;
    }
}

var PrimeImplicantTable = {
    // build a table that lists which MinTerm object covers the min_terms (passed in when this object was created)
    // For example, table would look like
    // {1 : [MinTerm obj, MinTerm obj],
    //  4 : [MinTerm obj],
    //  7 : [MinTerm obj, MinTerm obj, MinTerm obj}    
    build : function(min_terms, primes){
        var table = {};
        // loop through each min term number
        for(var i = 0; i < min_terms.length; i++){
            // ignore don't cares
            if(min_terms[i].is_dont_care)
                continue;
                
            var n = min_terms[i].covers[0];
            table[n] = []; // create the list for the covering MinTerm objects
            // find the MinTerm objects that cover this min term, and push it onto this min term's list
            for(var j = 0; j < primes.length; j++){
                if(primes[j].coversMinTerm(n)){
                    table[n].push(primes[j]);
//                    alert(table[min_terms[i].covers[0]]);
                }
            }
        }
        return table;
    }
}



/* Represented A + BC = [A, [B,C] */
var SumOfProducts = {
    distribute : function(x, y){
        var z = [];
        for(var i = 0; i < x.length; i++){
            for(var j = 0; j < y.length; j++){
                var tmp = this.removeDuplicates(x[i].concat(y[j]));
                z.push(tmp);
            }
        }
        
        z = this.applyIdentity(z);
        return z;
        //alert(this.prettyify(z));
        //alert(z.join("+"));
    },
    
    removeDuplicates : function(a){
        var b = {};
        for(var i = 0; i < a.length; i++){
            b[a[i]] = true;    
        }
        var tmp = [];
        for(var k in b){
            tmp.push(k);
        }
        return tmp;
    },
    
    // apply the identity x = x+xy
    applyIdentity : function(terms){
        for(var i = 0; i < terms.length; i++){
            for(var j = 0; j < terms.length; j++){
                if(terms[j] != null && terms[i] != null && i != j && this.arrayContainsArray(terms[i], terms[j])){
                    if(terms[j].length > terms[i].length){
                        terms[j] = null;
                    } else {                
                        terms[i] = terms[j];
                        terms[j] = null;
                    }
                }
            }
        }
        
        var new_terms = [];
        for(var i = 0; i < terms.length; i++){
            if(terms[i] != null)
                new_terms.push(terms[i]);
        }
        return new_terms;
    },
    
    inArray : function(a, c){
        for(var i = 0; i < a.length; i++){
            if(a[i] == c)
                return true;
        }
        return false;
    },
    
    arrayContainsArray : function(a, b){
        var len = Math.min(a.length, b.length);
        if(a.length < b.length){
            var tmp = a;
            a = b;
            b = tmp;
        }
        for(var i = 0; i < len; i++){
            if(!this.inArray(a, b[i]))
                return false;
        }
        return true;
    },

    fromTable : function(table){
        var terms = [];
        for(var k in table){
            var tuple = [];
            for(var i = 0; i < table[k].length; i++){
                tuple.push([table[k][i].id]);    
            }
            terms.push(tuple);
        }
        return terms;
    },

    reduce : function(set){
        if(set.length == 0){
            return [];    
        } else if(set.length == 1){;
            return this.applyIdentity(set[0]);
        }
    
        var dis = this.distribute(set[0], set[1]);
        for(var i = 2; i < set.length; i++){
            dis = this.distribute(dis, set[i]);
        }
        
        return dis;
    },
    
    toSymbols : function(solns, primes, letters){
        if(solns.length == 0)
            return [0]; // contradiction
        
        // first build a lookup table
        primes_lookup = {};
        for(var i = 0; i < primes.length; i++){
            primes_lookup[primes[i].id] = primes[i];
        }
        
        var list = [];
        // loop through every solution
        for(var i = 0; i < solns.length; i++){
            var clause = [];
            // loop through every MinTerm in this particular clause, map the bit pattern to letters, and join it with a "+"
            for(var j = 0; j < solns[i].length; j++){
                var term = [];
                var bits = primes_lookup[solns[i][j]].bits;
                var letters_offset = bits.length - 1;
                for(var k = bits.length - 1; k >= 0; k--){
                    if(bits[k] == "0"){
                        term.push(letters[letters_offset - k] + "'");    
                    } else if(bits[k] == "1") {
                        term.push(letters[letters_offset - k]);
                    }
                }
                clause.push(term.join(""));
            }
            list.push(clause.join("+"));
        }
        //alert(tmp.join("\n\n"));
        if(list.length == 1 && list[0] == "")
            list[0] = "1"; // it's a tautology
        return list;
    }    
}
