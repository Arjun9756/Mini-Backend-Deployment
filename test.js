function check(storagePath , id , path){
    return (storagePath && id) || path
}

console.log(check("abc", 1, undefined))  // true
console.log(check(undefined, undefined, "/a.txt")) // true
console.log(check(undefined, 1, undefined)) // false
console.log(check("abc", undefined, undefined)) // false
console.log(check(undefined, undefined, undefined)) // false
