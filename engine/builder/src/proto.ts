import protobuf from "protobufjs";

function buildProtobuf() {

}

protobuf.load(["path/to/your/first.proto", "path/to/your/second.proto"], function(err, root) {
    if (err) throw err;

    // Now you can use root to look up your types
    const FirstMessage = root.lookupType("firstPackageName.FirstMessage");
    const SecondMessage = root.lookupType("secondPackageName.SecondMessage");

    // Use FirstMessage and SecondMessage as needed
});

